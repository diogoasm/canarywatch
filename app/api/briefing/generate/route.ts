import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { daysUntil } from "@/lib/utils";

const MONTHLY_LIMIT = 2;

const SYSTEM_PROMPT =
  "You are Canary, a professional AI trading coach for retail investors. You give concise, data-driven portfolio briefings. You are direct, professional and human — like a smart friend who works in finance. You never give buy or sell recommendations. You flag risks, key dates and important context. You always end with a disclaimer. Return your response as a valid JSON object only — no markdown, no explanation, just the raw JSON.";

export async function POST() {
  const supabase = createClient();

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Profile + credits
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, briefings_used, briefings_reset_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Monthly reset check
  const now = new Date();
  const resetAt = new Date(profile.briefings_reset_at);
  let briefingsUsed: number = profile.briefings_used;

  const shouldReset =
    now.getFullYear() > resetAt.getFullYear() ||
    (now.getFullYear() === resetAt.getFullYear() &&
      now.getMonth() > resetAt.getMonth());

  if (shouldReset) {
    await supabase
      .from("profiles")
      .update({ briefings_used: 0, briefings_reset_at: now.toISOString() })
      .eq("id", user.id);
    briefingsUsed = 0;
  }

  // Limit check
  if (profile.plan === "free" && briefingsUsed >= MONTHLY_LIMIT) {
    return NextResponse.json(
      {
        error:
          "Monthly briefing limit reached. Upgrade to Premium for unlimited briefings.",
        limit_reached: true,
      },
      { status: 403 }
    );
  }

  // Watchlist
  const { data: watchlist, error: watchlistError } = await supabase
    .from("watchlist")
    .select("*")
    .order("added_at", { ascending: true });

  if (watchlistError) {
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }

  if (!watchlist || watchlist.length === 0) {
    return NextResponse.json(
      {
        error:
          "Add stocks to your watchlist before generating a briefing.",
        empty_watchlist: true,
      },
      { status: 400 }
    );
  }

  // Finnhub quotes + earnings
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey) {
    return NextResponse.json(
      { error: "Finnhub API key not configured" },
      { status: 503 }
    );
  }

  const stockData = await Promise.all(
    watchlist.map(async (item) => {
      try {
        const [quoteRes, earningsRes] = await Promise.all([
          fetch(
            `https://finnhub.io/api/v1/quote?symbol=${item.ticker}&token=${finnhubKey}`
          ),
          fetch(
            `https://finnhub.io/api/v1/calendar/earnings?symbol=${item.ticker}&token=${finnhubKey}`
          ),
        ]);
        const quoteJson = await quoteRes.json();
        const earningsJson = await earningsRes.json();

        const price: number | null =
          quoteJson.c && quoteJson.c !== 0 ? quoteJson.c : null;
        const changePercent: number = quoteJson.dp ?? 0;

        const today = new Date().toISOString().split("T")[0];
        const upcoming = (earningsJson.earningsCalendar ?? [])
          .filter((e: { date: string }) => e.date >= today)
          .sort(
            (a: { date: string }, b: { date: string }) =>
              a.date.localeCompare(b.date)
          );
        const nextEarnings: string | null =
          upcoming.length > 0 ? upcoming[0].date : null;

        const pnlDollars =
          price !== null
            ? (price - item.avg_buy_price) * item.shares
            : null;
        const pnlPercent =
          price !== null && item.avg_buy_price > 0
            ? ((price - item.avg_buy_price) / item.avg_buy_price) * 100
            : null;

        return {
          ticker: item.ticker,
          company_name: item.company_name,
          shares: item.shares,
          avg_buy_price: item.avg_buy_price,
          current_price: price,
          change_percent: changePercent,
          pnl_dollars: pnlDollars,
          pnl_percent: pnlPercent,
          next_earnings_date: nextEarnings,
          days_until_earnings: nextEarnings ? daysUntil(nextEarnings) : null,
        };
      } catch {
        return {
          ticker: item.ticker,
          company_name: item.company_name,
          shares: item.shares,
          avg_buy_price: item.avg_buy_price,
          current_price: null,
          change_percent: 0,
          pnl_dollars: null,
          pnl_percent: null,
          next_earnings_date: null,
          days_until_earnings: null,
        };
      }
    })
  );

  // Portfolio totals
  const invested = stockData.reduce(
    (sum, s) => sum + s.shares * s.avg_buy_price,
    0
  );
  const currentValue = stockData.reduce(
    (sum, s) =>
      sum +
      (s.current_price !== null
        ? s.current_price * s.shares
        : s.shares * s.avg_buy_price),
    0
  );
  const totalPnlDollars = currentValue - invested;
  const totalPnlPercent =
    invested > 0 ? (totalPnlDollars / invested) * 100 : 0;

  const withPnl = stockData.filter((s) => s.pnl_percent !== null);
  const bestPerformer =
    withPnl.length > 0
      ? withPnl.reduce((best, s) =>
          s.pnl_percent! > best.pnl_percent! ? s : best
        )
      : null;
  const worstPerformer =
    withPnl.length > 0
      ? withPnl.reduce((worst, s) =>
          s.pnl_percent! < worst.pnl_percent! ? s : worst
        )
      : null;

  // Key dates from real earnings data
  const keyDates = stockData
    .filter((s) => s.next_earnings_date !== null)
    .sort(
      (a, b) => (a.days_until_earnings ?? 9999) - (b.days_until_earnings ?? 9999)
    )
    .map((s) => ({
      ticker: s.ticker,
      company_name: s.company_name,
      earnings_date: s.next_earnings_date,
      days_until: s.days_until_earnings,
    }));

  // Build prompt
  const stockLines = stockData
    .map((s) => {
      const price =
        s.current_price !== null ? `$${s.current_price.toFixed(2)}` : "N/A";
      const pnlStr =
        s.pnl_dollars !== null && s.pnl_percent !== null
          ? `${s.pnl_dollars >= 0 ? "+" : ""}$${Math.abs(s.pnl_dollars).toFixed(2)} (${s.pnl_percent >= 0 ? "+" : ""}${s.pnl_percent.toFixed(2)}%)`
          : "N/A";
      const earnings =
        s.next_earnings_date !== null
          ? `${s.next_earnings_date} (in ${s.days_until_earnings} days)`
          : "Unknown";
      return `${s.ticker} - ${s.company_name} | Shares: ${s.shares} | Avg Buy: $${Number(s.avg_buy_price).toFixed(2)} | Current: ${price} | P&L: ${pnlStr} | Next Earnings: ${earnings}`;
    })
    .join("\n");

  const userPrompt = `Analyse this portfolio and give me a briefing:

${stockLines}

Total Portfolio Value: $${currentValue.toFixed(2)} | Total P&L: ${totalPnlDollars >= 0 ? "+" : ""}$${Math.abs(totalPnlDollars).toFixed(2)} (${totalPnlPercent >= 0 ? "+" : ""}${totalPnlPercent.toFixed(2)}%)

Be concise. Max 2-3 sentences per section. Flag the most important things only.

Return ONLY a valid JSON object with exactly these keys:
- "canary_warnings": array of strings — one string per notable risk or flag (empty array if none)
- "market_context": string — 2-3 sentences of relevant market/sector context for these holdings
- "outlook": array of strings — one per stock, format each as "TICKER: forward-looking note"
- "disclaimer": string — brief financial disclaimer`;

  // Claude API
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let aiResult: {
    canary_warnings: string[];
    market_context: string;
    outlook: string[];
    disclaimer: string;
  };

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "{}";
    const clean = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    aiResult = JSON.parse(clean);
  } catch (err) {
    console.error("[briefing] Claude API error:", err);
    return NextResponse.json(
      { error: "Failed to generate briefing. Please try again." },
      { status: 500 }
    );
  }

  // Compose final content
  const briefingContent = {
    portfolio_snapshot: {
      total_value: currentValue,
      total_pnl_dollars: totalPnlDollars,
      total_pnl_percent: totalPnlPercent,
      best_performer: bestPerformer
        ? {
            ticker: bestPerformer.ticker,
            pnl_percent: bestPerformer.pnl_percent!,
          }
        : null,
      worst_performer: worstPerformer
        ? {
            ticker: worstPerformer.ticker,
            pnl_percent: worstPerformer.pnl_percent!,
          }
        : null,
    },
    key_dates: keyDates,
    canary_warnings: Array.isArray(aiResult.canary_warnings)
      ? aiResult.canary_warnings
      : [],
    market_context: aiResult.market_context ?? "",
    outlook: Array.isArray(aiResult.outlook) ? aiResult.outlook : [],
    disclaimer:
      aiResult.disclaimer ??
      "This briefing is AI-generated for informational purposes only. Not financial advice. Always do your own research before making investment decisions.",
  };

  // Save briefing
  const { data: savedBriefing, error: saveError } = await supabase
    .from("briefings")
    .insert({
      user_id: user.id,
      content: briefingContent,
      type: "portfolio",
    })
    .select()
    .single();

  if (saveError) {
    console.error("[briefing] save error:", saveError);
    return NextResponse.json(
      { error: "Failed to save briefing" },
      { status: 500 }
    );
  }

  // Increment usage
  await supabase
    .from("profiles")
    .update({ briefings_used: briefingsUsed + 1 })
    .eq("id", user.id);

  return NextResponse.json({ briefing: savedBriefing });
}
