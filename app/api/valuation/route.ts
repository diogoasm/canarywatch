import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

// DCF assumptions — conservative, fixed
const DISCOUNT_RATE = 0.1; // r
const TERMINAL_GROWTH = 0.025; // g∞
const MAX_GROWTH = 0.15; // cap on observed FCF growth
const FALLBACK_GROWTH = 0.03; // used when FCF is shrinking
const PROJECTION_YEARS = 5;

// ─── Response shape ────────────────────────────────────────────────────────

export interface FcfQuarter {
  date: string;
  free_cash_flow: number;
}

export interface DcfResult {
  applicable: boolean;
  intrinsic_value: number | null; // our calculation, per share
  fmp_estimate: number | null; // FMP profile's own dcf value (cross-check)
  growth_rate: number | null; // growth assumption used (fraction)
  annual_fcf: number | null; // annualised FCF the model starts from
  shares_outstanding: number | null;
}

export interface ValuationData {
  ticker: string;
  current_price: number | null;
  dcf: DcfResult;
  fcf_quarters: FcfQuarter[];
  pays_dividend: boolean;
  annual_dividend: number | null; // trailing 12-month dividend per share (D0)
  dividend_growth_rate: number | null; // fraction, 3-year CAGR
  has_data: boolean;
}

// ─── FMP fetch helper ──────────────────────────────────────────────────────

async function fmpJson(path: string, key: string): Promise<unknown> {
  try {
    const res = await fetch(
      `${FMP_BASE}${path}${path.includes("?") ? "&" : "?"}apikey=${key}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface DividendEntry {
  date: string;
  adjDividend?: number;
  dividend?: number;
}

// Sum of dividends per share paid within [start, end)
function dividendsInWindow(
  entries: DividendEntry[],
  start: Date,
  end: Date
): number {
  return entries.reduce((sum, e) => {
    const d = new Date(e.date + "T00:00:00");
    if (d >= start && d < end) {
      return sum + (e.adjDividend ?? e.dividend ?? 0);
    }
    return sum;
  }, 0);
}

// ─── Manual DCF (free-tier data only) ──────────────────────────────────────

function calculateDcf(
  fcfQuarters: FcfQuarter[], // oldest → newest
  sharesOutstanding: number | null
): { intrinsic: number | null; growthRate: number | null; annualFcf: number | null } {
  if (fcfQuarters.length === 0) {
    return { intrinsic: null, growthRate: null, annualFcf: null };
  }

  // Annualise: average quarterly FCF × 4 (robust when fewer than 4 quarters)
  const avgQuarterly =
    fcfQuarters.reduce((s, q) => s + q.free_cash_flow, 0) / fcfQuarters.length;
  const annualFcf = avgQuarterly * 4;

  if (annualFcf <= 0) {
    return { intrinsic: null, growthRate: null, annualFcf };
  }

  // Growth assumption: newest vs oldest quarter across the window (~YoY).
  // Growing → cap at 15%. Shrinking → conservative 3% default.
  const oldest = fcfQuarters[0].free_cash_flow;
  const newest = fcfQuarters[fcfQuarters.length - 1].free_cash_flow;
  let growthRate = FALLBACK_GROWTH;
  if (oldest > 0 && newest > oldest) {
    growthRate = Math.min((newest - oldest) / oldest, MAX_GROWTH);
  }

  if (sharesOutstanding === null || sharesOutstanding <= 0) {
    return { intrinsic: null, growthRate, annualFcf };
  }

  // Project 5 years of FCF, discount back at 10%
  let presentValue = 0;
  let fcf = annualFcf;
  for (let year = 1; year <= PROJECTION_YEARS; year++) {
    fcf *= 1 + growthRate;
    presentValue += fcf / Math.pow(1 + DISCOUNT_RATE, year);
  }

  // Terminal value: Year 5 FCF × (1 + g∞) / (r − g∞), discounted 5 years
  const terminalValue =
    (fcf * (1 + TERMINAL_GROWTH)) / (DISCOUNT_RATE - TERMINAL_GROWTH);
  presentValue += terminalValue / Math.pow(1 + DISCOUNT_RATE, PROJECTION_YEARS);

  return {
    intrinsic: presentValue / sharesOutstanding,
    growthRate,
    annualFcf,
  };
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const ticker = request.nextUrl.searchParams.get("ticker")?.toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  }

  const fmpKey = process.env.FMP_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!fmpKey) {
    return NextResponse.json(
      { error: "FMP API key not configured" },
      { status: 503 }
    );
  }

  const [cashFlowRaw, incomeRaw, profileRaw, dividendRaw, quoteRaw] =
    await Promise.all([
      fmpJson(`/cash-flow-statement/${ticker}?period=quarter&limit=4`, fmpKey),
      fmpJson(`/income-statement/${ticker}?period=quarter&limit=4`, fmpKey),
      fmpJson(`/profile/${ticker}`, fmpKey),
      fmpJson(`/historical-price-full/stock_dividend/${ticker}`, fmpKey),
      finnhubKey
        ? fetch(
            `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`,
            { cache: "no-store" }
          )
            .then((r) => r.json())
            .catch(() => null)
        : Promise.resolve(null),
    ]);

  // ── Company profile (price fallback, shares fallback, FMP's own dcf) ─────

  const profile =
    Array.isArray(profileRaw) && profileRaw.length > 0
      ? (profileRaw[0] as {
          price?: number;
          mktCap?: number;
          dcf?: number;
        })
      : null;

  // ── Live price (Finnhub, fall back to FMP profile) ───────────────────────

  const quote = quoteRaw as { c?: number } | null;
  let currentPrice: number | null = quote?.c && quote.c !== 0 ? quote.c : null;
  if (currentPrice === null && profile?.price && profile.price > 0) {
    currentPrice = profile.price;
  }

  // ── Free cash flow trend (last 4 quarters) ───────────────────────────────

  let fcfQuarters: FcfQuarter[] = [];
  if (Array.isArray(cashFlowRaw)) {
    fcfQuarters = (cashFlowRaw as { date: string; freeCashFlow?: number }[])
      .filter((q) => typeof q.freeCashFlow === "number")
      .map((q) => ({ date: q.date, free_cash_flow: q.freeCashFlow! }))
      .reverse(); // oldest → newest
  }

  // ── Shares outstanding: income statement, fall back to mktCap / price ────

  let sharesOutstanding: number | null = null;
  if (Array.isArray(incomeRaw) && incomeRaw.length > 0) {
    const latest = incomeRaw[0] as {
      weightedAverageShsOutDil?: number;
      weightedAverageShsOut?: number;
    };
    const shs = latest.weightedAverageShsOutDil ?? latest.weightedAverageShsOut;
    if (typeof shs === "number" && shs > 0) sharesOutstanding = shs;
  }
  if (
    sharesOutstanding === null &&
    profile?.mktCap &&
    currentPrice !== null &&
    currentPrice > 0
  ) {
    sharesOutstanding = profile.mktCap / currentPrice;
  }

  // ── DCF ──────────────────────────────────────────────────────────────────

  const { intrinsic, growthRate, annualFcf } = calculateDcf(
    fcfQuarters,
    sharesOutstanding
  );

  const fmpEstimate =
    profile && typeof profile.dcf === "number" && profile.dcf > 0
      ? profile.dcf
      : null;

  const dcf: DcfResult = {
    applicable: intrinsic !== null,
    intrinsic_value: intrinsic,
    fmp_estimate: fmpEstimate,
    growth_rate: growthRate,
    annual_fcf: annualFcf,
    shares_outstanding: sharesOutstanding,
  };

  // ── Dividends (free tier historical endpoint) ────────────────────────────

  const dividendHistory: DividendEntry[] = Array.isArray(
    (dividendRaw as { historical?: DividendEntry[] } | null)?.historical
  )
    ? (dividendRaw as { historical: DividendEntry[] }).historical
    : [];

  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(now.getFullYear() - 1);

  const annualDividend = dividendsInWindow(dividendHistory, yearAgo, now);
  const paysDividend = annualDividend > 0;

  // 3-year dividend growth rate (CAGR of trailing-12-month sums)
  let dividendGrowthRate: number | null = null;
  if (paysDividend) {
    const threeYearsAgoEnd = new Date(now);
    threeYearsAgoEnd.setFullYear(now.getFullYear() - 3);
    const fourYearsAgo = new Date(now);
    fourYearsAgo.setFullYear(now.getFullYear() - 4);

    const oldAnnual = dividendsInWindow(
      dividendHistory,
      fourYearsAgo,
      threeYearsAgoEnd
    );
    if (oldAnnual > 0) {
      dividendGrowthRate = Math.pow(annualDividend / oldAnnual, 1 / 3) - 1;
    }
  }

  // "Unavailable" only when FMP has nothing at all for this ticker —
  // a live price alone doesn't make the valuation tools meaningful
  const hasData = dcf.applicable || fcfQuarters.length > 0 || paysDividend;

  const payload: ValuationData = {
    ticker,
    current_price: currentPrice,
    dcf,
    fcf_quarters: fcfQuarters,
    pays_dividend: paysDividend,
    annual_dividend: paysDividend ? annualDividend : null,
    dividend_growth_rate: dividendGrowthRate,
    has_data: hasData,
  };

  return NextResponse.json(payload);
}
