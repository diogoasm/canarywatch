import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { daysUntil } from "@/lib/utils";
import {
  getEarningsCalendar as getFmpEarnings,
  getAnalystEstimates,
  getAnalystRating,
  getPriceTarget as getFmpPriceTarget,
} from "@/lib/fmp";
import {
  getUpcomingEarnings,
  getRecentEarnings,
  getFinnhubPriceTarget,
  getRecommendationTrend,
  getBasicMetrics,
} from "@/lib/finnhub";

const MONTHLY_LIMIT = 2;

const SYSTEM_PROMPT = `You are Canary, a professional AI trading coach for retail investors. You receive detailed financial data including earnings history, analyst estimates, price targets, and fundamental metrics. Use ALL of this data to give a specific, data-driven briefing.

For each stock:
- Reference whether last quarter beat or missed estimates and by how much
- State whether the stock is on track to beat next quarter based on recent performance trends
- Reference the analyst price target and what the upside implies
- Flag earnings dates precisely — always give the date and days remaining
- Flag if a stock is significantly below analyst price target (potential upside) or above (potential overvaluation)
- Flag stocks with no institutional analyst coverage as higher-risk positions

Be direct and specific. Use real numbers. Never be vague. Max 2-3 sentences per section but make every sentence count.

Return your response as a valid JSON object only — no markdown, no explanation, just the raw JSON with these keys: canary_warnings, market_context, outlook, disclaimer`;

// ─── Formatting helpers ────────────────────────────────────────────────────

function fmtRev(n: number | null): string {
  if (n === null) return "N/A";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDateStr(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function beatMissLabel(pct: number | null): string {
  if (pct === null) return "vs estimate unknown";
  return pct >= 0
    ? `BEAT by ${Math.abs(pct).toFixed(1)}%`
    : `MISS by ${Math.abs(pct).toFixed(1)}%`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, briefings_used, briefings_reset_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Monthly reset
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
        error: "Add stocks to your watchlist before generating a briefing.",
        empty_watchlist: true,
      },
      { status: 400 }
    );
  }

  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey) {
    return NextResponse.json(
      { error: "Finnhub API key not configured" },
      { status: 503 }
    );
  }

  // ── Fetch all data sources in parallel per stock ──────────────────────────

  const stockData = await Promise.all(
    watchlist.map(async (item) => {
      try {
        const [
          quoteRes,
          fmpEarnings,
          fmpEstimates,
          fmpRating,
          fmpTarget,
          fhUpcoming,
          fhRecent,
          fhTarget,
          fhConsensus,
          fhMetrics,
        ] = await Promise.all([
          fetch(
            `https://finnhub.io/api/v1/quote?symbol=${item.ticker}&token=${finnhubKey}`,
            { cache: "no-store" }
          ),
          getFmpEarnings(item.ticker),
          getAnalystEstimates(item.ticker),
          getAnalystRating(item.ticker),
          getFmpPriceTarget(item.ticker),
          getUpcomingEarnings(item.ticker),
          getRecentEarnings(item.ticker),
          getFinnhubPriceTarget(item.ticker),
          getRecommendationTrend(item.ticker),
          getBasicMetrics(item.ticker),
        ]);

        const quoteJson = await quoteRes.json();
        const price: number | null =
          quoteJson.c && quoteJson.c !== 0 ? quoteJson.c : null;
        const changePercent: number = quoteJson.dp ?? 0;

        // ── Resolve earnings date: FMP → Finnhub upcoming → Finnhub +91d estimate ──

        let nextEarningsDate: string | null = null;
        let earningsConfirmed = false;

        if (fmpEarnings.next_date !== null) {
          nextEarningsDate = fmpEarnings.next_date;
          earningsConfirmed = fmpEarnings.confirmed;
        } else if (fhUpcoming.length > 0) {
          nextEarningsDate = fhUpcoming[0].date;
          earningsConfirmed = true;
        } else if (fhRecent.length > 0 && fhRecent[0].period) {
          nextEarningsDate = addDays(fhRecent[0].period, 91);
          earningsConfirmed = false;
        }

        // ── Resolve last quarter: FMP → Finnhub stock/earnings ────────────────

        let lastQuarter = fmpEarnings.last_quarter;
        if (lastQuarter === null && fhRecent.length > 0) {
          const q = fhRecent[0];
          const epsBeatPct =
            q.actual !== null && q.estimate !== null && q.estimate !== 0
              ? ((q.actual - q.estimate) / Math.abs(q.estimate)) * 100
              : null;
          lastQuarter = {
            date: q.period,
            eps_actual: q.actual,
            eps_estimated: q.estimate,
            eps_beat_pct: epsBeatPct,
            revenue_actual: null,
            revenue_estimated: null,
            revenue_beat_pct: null,
          };
        }

        // ── Resolve analyst data: FMP → Finnhub ───────────────────────────────

        const analystConsensus = fmpRating.consensus ?? fhConsensus;
        const priceTarget =
          fmpTarget.target_consensus ?? fhTarget.targetMean;
        const priceTargetHigh =
          fmpTarget.target_high ?? fhTarget.targetHigh;
        const priceTargetLow =
          fmpTarget.target_low ?? fhTarget.targetLow;

        const upsidePct =
          priceTarget !== null && price !== null && price > 0
            ? ((priceTarget - price) / price) * 100
            : null;

        const pnlDollars =
          price !== null ? (price - item.avg_buy_price) * item.shares : null;
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
          next_earnings_date: nextEarningsDate,
          days_until_earnings: nextEarningsDate ? daysUntil(nextEarningsDate) : null,
          earnings_confirmed: earningsConfirmed,
          last_quarter: lastQuarter,
          next_eps_estimate: fmpEstimates.next_eps_estimate,
          next_revenue_estimate: fmpEstimates.next_revenue_estimate,
          analyst_consensus: analystConsensus,
          price_target: priceTarget,
          price_target_high: priceTargetHigh,
          price_target_low: priceTargetLow,
          upside_pct: upsidePct,
          metrics: fhMetrics,
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
          earnings_confirmed: false,
          last_quarter: null,
          next_eps_estimate: null,
          next_revenue_estimate: null,
          analyst_consensus: null,
          price_target: null,
          price_target_high: null,
          price_target_low: null,
          upside_pct: null,
          metrics: {
            week52High: null,
            week52Low: null,
            peRatio: null,
            revenueGrowthTTMYoy: null,
          },
        };
      }
    })
  );

  // ── Portfolio totals ───────────────────────────────────────────────────────

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

  // ── Key dates (all stocks) ─────────────────────────────────────────────────

  const keyDates = stockData
    .map((s) => ({
      ticker: s.ticker,
      company_name: s.company_name,
      earnings_date: s.next_earnings_date,
      days_until: s.next_earnings_date ? daysUntil(s.next_earnings_date) : null,
      confirmed: s.earnings_confirmed,
    }))
    .sort((a, b) => (a.days_until ?? 99999) - (b.days_until ?? 99999));

  // ── Build Claude context string ────────────────────────────────────────────

  const stockLines = stockData
    .map((s) => {
      const price =
        s.current_price !== null ? `$${s.current_price.toFixed(2)}` : "N/A";
      const pnlStr =
        s.pnl_dollars !== null && s.pnl_percent !== null
          ? `${s.pnl_dollars >= 0 ? "+" : ""}$${Math.abs(s.pnl_dollars).toFixed(2)} (${s.pnl_percent >= 0 ? "+" : ""}${s.pnl_percent.toFixed(2)}%)`
          : "N/A";

      // Earnings line
      const earningsLabel = s.earnings_confirmed
        ? "CONFIRMED"
        : "~estimated based on 90-day cadence";
      const earningsStr =
        s.next_earnings_date !== null
          ? `${fmtDateStr(s.next_earnings_date)} (${s.days_until_earnings} days away) — ${earningsLabel}`
          : "No date found in any data source";

      // Last quarter
      const lq = s.last_quarter;
      const lastQStr = lq
        ? [
            lq.revenue_actual !== null
              ? `Revenue ${fmtRev(lq.revenue_actual)} actual vs ${fmtRev(lq.revenue_estimated)} estimated (${beatMissLabel(lq.revenue_beat_pct)})`
              : null,
            `EPS ${lq.eps_actual?.toFixed(2) ?? "N/A"} actual vs ${lq.eps_estimated?.toFixed(2) ?? "N/A"} estimated (${beatMissLabel(lq.eps_beat_pct)})`,
          ]
            .filter(Boolean)
            .join(" | ")
        : "No historical earnings data available";

      // Next quarter estimates
      const nextQStr =
        s.next_revenue_estimate !== null || s.next_eps_estimate !== null
          ? `Revenue ${fmtRev(s.next_revenue_estimate)} | EPS ${s.next_eps_estimate !== null ? s.next_eps_estimate.toFixed(2) : "N/A"}`
          : "No analyst estimates available";

      // Analyst line
      const noAnalystCoverage =
        s.analyst_consensus === null && s.price_target === null;
      const analystStr = noAnalystCoverage
        ? "No institutional coverage found — small-cap/micro-cap with limited analyst following"
        : [
            s.analyst_consensus ?? "No consensus data",
            s.price_target !== null
              ? `Price Target: $${s.price_target.toFixed(2)} avg${s.price_target_high ? ` (range $${s.price_target_low?.toFixed(2)} — $${s.price_target_high?.toFixed(2)})` : ""}${s.upside_pct !== null ? ` — ${s.upside_pct >= 0 ? "+" : ""}${s.upside_pct.toFixed(1)}% ${s.upside_pct >= 0 ? "upside" : "downside"} from current` : ""}`
              : "Price Target: N/A",
          ].join(" | ");

      // Basic metrics line
      const metricParts: string[] = [];
      if (s.metrics.week52High !== null && s.metrics.week52Low !== null) {
        metricParts.push(
          `52-Wk: $${s.metrics.week52Low.toFixed(2)} — $${s.metrics.week52High.toFixed(2)}`
        );
      }
      if (s.metrics.peRatio !== null) {
        metricParts.push(`P/E: ${s.metrics.peRatio.toFixed(1)}`);
      }
      if (s.metrics.revenueGrowthTTMYoy !== null) {
        const pct = s.metrics.revenueGrowthTTMYoy * 100;
        metricParts.push(
          `Rev Growth (YoY): ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
        );
      }
      const metricsStr =
        metricParts.length > 0 ? metricParts.join(" | ") : null;

      const lines = [
        `${s.ticker} - ${s.company_name}`,
        `Shares: ${s.shares} | Avg Buy: $${Number(s.avg_buy_price).toFixed(2)} | Current: ${price} | P&L: ${pnlStr}`,
        metricsStr ? `Fundamentals: ${metricsStr}` : null,
        `Next Earnings: ${earningsStr}`,
        `Last Quarter: ${lastQStr}`,
        `Next Quarter Estimates: ${nextQStr}`,
        `Analyst Consensus: ${analystStr}`,
        "---",
      ];

      return lines.filter(Boolean).join("\n");
    })
    .join("\n");

  const userPrompt = `Analyse this portfolio and give me a detailed briefing using all the data provided:

${stockLines}

Total Portfolio Value: $${currentValue.toFixed(2)} | Total P&L: ${totalPnlDollars >= 0 ? "+" : ""}$${Math.abs(totalPnlDollars).toFixed(2)} (${totalPnlPercent >= 0 ? "+" : ""}${totalPnlPercent.toFixed(2)}%)

Return ONLY a valid JSON object with exactly these keys:
- "canary_warnings": array of objects — each {"message": string, "severity": "red"|"yellow"|"green"} — red for urgent risks (earnings imminent, big losses, no coverage), yellow for moderate watch items, green for positive signals (empty array if truly none)
- "market_context": string — 2-3 sentences of relevant sector/market context for these holdings
- "outlook": array of strings — one per stock, format: "TICKER: specific forward-looking note referencing actual data from the briefing"
- "disclaimer": string — brief financial disclaimer`;

  // ── Call Claude ────────────────────────────────────────────────────────────

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  interface AIWarning {
    message: string;
    severity: "red" | "yellow" | "green";
  }

  let aiResult: {
    canary_warnings: AIWarning[];
    market_context: string;
    outlook: string[];
    disclaimer: string;
  };

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
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

  // ── Normalize warnings ─────────────────────────────────────────────────────

  const validSeverities = new Set(["red", "yellow", "green"]);
  const canaryWarnings: AIWarning[] = Array.isArray(aiResult.canary_warnings)
    ? aiResult.canary_warnings.map((w) => {
        if (typeof w === "string") return { message: w, severity: "red" as const };
        const wo = w as Partial<AIWarning>;
        return {
          message: wo.message ?? String(w),
          severity: validSeverities.has(wo.severity ?? "")
            ? (wo.severity as "red" | "yellow" | "green")
            : ("red" as const),
        };
      })
    : [];

  // ── Compose briefing content ───────────────────────────────────────────────

  const briefingContent = {
    portfolio_snapshot: {
      total_value: currentValue,
      total_pnl_dollars: totalPnlDollars,
      total_pnl_percent: totalPnlPercent,
      best_performer: bestPerformer
        ? { ticker: bestPerformer.ticker, pnl_percent: bestPerformer.pnl_percent! }
        : null,
      worst_performer: worstPerformer
        ? { ticker: worstPerformer.ticker, pnl_percent: worstPerformer.pnl_percent! }
        : null,
    },
    key_dates: keyDates,
    canary_warnings: canaryWarnings,
    market_context: aiResult.market_context ?? "",
    outlook: Array.isArray(aiResult.outlook) ? aiResult.outlook : [],
    disclaimer:
      aiResult.disclaimer ??
      "This briefing is AI-generated for informational purposes only. Not financial advice. Always do your own research before making investment decisions.",
  };

  // ── Save to Supabase ───────────────────────────────────────────────────────

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

  await supabase
    .from("profiles")
    .update({ briefings_used: briefingsUsed + 1 })
    .eq("id", user.id);

  return NextResponse.json({ briefing: savedBriefing });
}
