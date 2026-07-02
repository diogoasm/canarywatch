import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

// ─── Response shape ────────────────────────────────────────────────────────

export interface FcfQuarter {
  date: string;
  free_cash_flow: number;
}

export interface ValuationData {
  ticker: string;
  current_price: number | null;
  dcf_value: number | null;
  fcf_quarters: FcfQuarter[];
  pays_dividend: boolean;
  annual_dividend: number | null; // trailing 12-month dividend per share (D0)
  dividend_growth_rate: number | null; // fraction, e.g. 0.05 = 5% (3-year CAGR)
  dividend_yield: number | null; // fraction
  has_data: boolean;
}

// ─── FMP fetch helpers ─────────────────────────────────────────────────────

async function fmpJson(path: string, key: string): Promise<unknown> {
  try {
    const res = await fetch(`${FMP_BASE}${path}${path.includes("?") ? "&" : "?"}apikey=${key}`, {
      next: { revalidate: 3600 },
    });
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

  const [dcfRaw, cashFlowRaw, ratiosRaw, dividendRaw, quoteRaw] =
    await Promise.all([
      fmpJson(`/discounted-cash-flow/${ticker}`, fmpKey),
      fmpJson(`/cash-flow-statement/${ticker}?period=quarter&limit=4`, fmpKey),
      fmpJson(`/ratios-ttm/${ticker}`, fmpKey),
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

  // ── Live price (Finnhub, fall back to FMP's "Stock Price") ──────────────

  const quote = quoteRaw as { c?: number } | null;
  let currentPrice: number | null =
    quote?.c && quote.c !== 0 ? quote.c : null;

  // ── DCF ──────────────────────────────────────────────────────────────────

  let dcfValue: number | null = null;
  if (Array.isArray(dcfRaw) && dcfRaw.length > 0) {
    const entry = dcfRaw[0] as { dcf?: number; "Stock Price"?: number };
    dcfValue = typeof entry.dcf === "number" && entry.dcf !== 0 ? entry.dcf : null;
    if (currentPrice === null && typeof entry["Stock Price"] === "number") {
      currentPrice = entry["Stock Price"];
    }
  }

  // ── Free cash flow trend (last 4 quarters) ───────────────────────────────

  let fcfQuarters: FcfQuarter[] = [];
  if (Array.isArray(cashFlowRaw)) {
    fcfQuarters = (
      cashFlowRaw as { date: string; freeCashFlow?: number }[]
    )
      .filter((q) => typeof q.freeCashFlow === "number")
      .map((q) => ({ date: q.date, free_cash_flow: q.freeCashFlow! }))
      .reverse(); // oldest → newest
  }

  // ── Dividends ────────────────────────────────────────────────────────────

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
  let growthRate: number | null = null;
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
      growthRate = Math.pow(annualDividend / oldAnnual, 1 / 3) - 1;
    }
  }

  // Dividend yield from ratios (TTM)
  let dividendYield: number | null = null;
  if (Array.isArray(ratiosRaw) && ratiosRaw.length > 0) {
    const r = ratiosRaw[0] as { dividendYielTTM?: number; dividendYieldTTM?: number };
    // FMP's field is famously misspelled "dividendYielTTM" — check both
    const y = r.dividendYieldTTM ?? r.dividendYielTTM;
    if (typeof y === "number" && y > 0) dividendYield = y;
  }

  const hasData = dcfValue !== null || fcfQuarters.length > 0 || paysDividend;

  const payload: ValuationData = {
    ticker,
    current_price: currentPrice,
    dcf_value: dcfValue,
    fcf_quarters: fcfQuarters,
    pays_dividend: paysDividend,
    annual_dividend: paysDividend ? annualDividend : null,
    dividend_growth_rate: growthRate,
    dividend_yield: dividendYield,
    has_data: hasData,
  };

  return NextResponse.json(payload);
}
