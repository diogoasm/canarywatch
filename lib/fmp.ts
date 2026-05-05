const BASE_URL = "https://financialmodelingprep.com/api/v3";
const apiKey = () => process.env.FMP_API_KEY ?? "";

// ─── FMP response shapes ───────────────────────────────────────────────────

interface FmpEarningEntry {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  revenue: number | null;
  revenueEstimated: number | null;
  fiscalDateEnding: string;
  time: string;
}

interface FmpAnalystEstimate {
  symbol: string;
  date: string;
  estimatedRevenueLow: number;
  estimatedRevenueHigh: number;
  estimatedRevenueAvg: number;
  estimatedEpsAvg: number;
  estimatedEpsHigh: number;
  estimatedEpsLow: number;
}

interface FmpAnalystRecommendation {
  date: string;
  symbol: string;
  analystRatingsStrongBuy: number;
  analystRatingsBuy: number;
  analystRatingsHold: number;
  analystRatingsSell: number;
  analystRatingsStrongSell: number;
}

interface FmpPriceTarget {
  symbol: string;
  targetHigh: number | null;
  targetLow: number | null;
  targetConsensus: number | null;
  targetMedian: number | null;
}

// ─── Public return types ───────────────────────────────────────────────────

export interface EarningsData {
  next_date: string | null;
  confirmed: boolean;
  last_quarter: {
    date: string;
    eps_actual: number | null;
    eps_estimated: number | null;
    eps_beat_pct: number | null;
    revenue_actual: number | null;
    revenue_estimated: number | null;
    revenue_beat_pct: number | null;
  } | null;
}

export interface AnalystEstimatesData {
  next_eps_estimate: number | null;
  next_revenue_estimate: number | null;
}

export interface AnalystRatingData {
  consensus: string | null;
}

export interface PriceTargetData {
  target_consensus: number | null;
  target_high: number | null;
  target_low: number | null;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function deriveConsensus(r: FmpAnalystRecommendation): string {
  const sb = r.analystRatingsStrongBuy ?? 0;
  const b = r.analystRatingsBuy ?? 0;
  const h = r.analystRatingsHold ?? 0;
  const s = r.analystRatingsSell ?? 0;
  const ss = r.analystRatingsStrongSell ?? 0;
  const total = sb + b + h + s + ss;
  if (total === 0) return "N/A";
  const bullRatio = (sb + b) / total;
  const bearRatio = (s + ss) / total;
  if (sb / total > 0.4) return "Strong Buy";
  if (bullRatio > 0.6) return "Buy";
  if (ss / total > 0.3) return "Strong Sell";
  if (bearRatio > 0.5) return "Sell";
  return "Hold";
}

function beatPct(actual: number | null, estimated: number | null): number | null {
  if (actual === null || estimated === null || estimated === 0) return null;
  return ((actual - estimated) / Math.abs(estimated)) * 100;
}

// ─── API functions ─────────────────────────────────────────────────────────

export async function getEarningsCalendar(ticker: string): Promise<EarningsData> {
  try {
    const key = apiKey();
    if (!key) return { next_date: null, confirmed: false, last_quarter: null };

    const res = await fetch(
      `${BASE_URL}/historical/earning_calendar/${ticker}?apikey=${key}`,
      { next: { revalidate: 3600 } }
    );
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return { next_date: null, confirmed: false, last_quarter: null };

    const entries = data as FmpEarningEntry[];

    // eps === null → not yet reported (upcoming)
    const upcoming = entries
      .filter((e) => e.eps === null)
      .sort((a, b) => a.date.localeCompare(b.date));

    // eps !== null → reported (past)
    const past = entries
      .filter((e) => e.eps !== null)
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first

    let next_date: string | null = null;
    let confirmed = false;

    if (upcoming.length > 0) {
      next_date = upcoming[0].date;
      confirmed = true;
    } else if (past.length > 0) {
      // Estimate next earnings: last known date + 91 days
      const lastDate = new Date(past[0].date + "T00:00:00");
      lastDate.setDate(lastDate.getDate() + 91);
      next_date = lastDate.toISOString().split("T")[0];
      confirmed = false;
    }

    const lastQ = past.length > 0 ? past[0] : null;
    const last_quarter = lastQ
      ? {
          date: lastQ.date,
          eps_actual: lastQ.eps,
          eps_estimated: lastQ.epsEstimated,
          eps_beat_pct: beatPct(lastQ.eps, lastQ.epsEstimated),
          revenue_actual: lastQ.revenue,
          revenue_estimated: lastQ.revenueEstimated,
          revenue_beat_pct: beatPct(lastQ.revenue, lastQ.revenueEstimated),
        }
      : null;

    return { next_date, confirmed, last_quarter };
  } catch {
    return { next_date: null, confirmed: false, last_quarter: null };
  }
}

export async function getAnalystEstimates(ticker: string): Promise<AnalystEstimatesData> {
  try {
    const key = apiKey();
    if (!key) return { next_eps_estimate: null, next_revenue_estimate: null };

    const res = await fetch(
      `${BASE_URL}/analyst-estimates/${ticker}?period=quarter&apikey=${key}`,
      { next: { revalidate: 86400 } }
    );
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return { next_eps_estimate: null, next_revenue_estimate: null };
    }

    const estimates = data as FmpAnalystEstimate[];
    const today = new Date().toISOString().split("T")[0];
    const upcoming = estimates.filter((e) => e.date >= today);
    const next = upcoming.length > 0 ? upcoming[0] : estimates[0];

    return {
      next_eps_estimate: next.estimatedEpsAvg ?? null,
      next_revenue_estimate: next.estimatedRevenueAvg ?? null,
    };
  } catch {
    return { next_eps_estimate: null, next_revenue_estimate: null };
  }
}

export async function getAnalystRating(ticker: string): Promise<AnalystRatingData> {
  try {
    const key = apiKey();
    if (!key) return { consensus: null };

    const res = await fetch(
      `${BASE_URL}/analyst-stock-recommendations/${ticker}?apikey=${key}`,
      { next: { revalidate: 86400 } }
    );
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return { consensus: null };

    return { consensus: deriveConsensus((data as FmpAnalystRecommendation[])[0]) };
  } catch {
    return { consensus: null };
  }
}

export async function getPriceTarget(ticker: string): Promise<PriceTargetData> {
  try {
    const key = apiKey();
    if (!key) return { target_consensus: null, target_high: null, target_low: null };

    const res = await fetch(
      `${BASE_URL}/price-target-consensus/${ticker}?apikey=${key}`,
      { next: { revalidate: 86400 } }
    );
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return { target_consensus: null, target_high: null, target_low: null };
    }

    const t = (data as FmpPriceTarget[])[0];
    return {
      target_consensus: t.targetConsensus ?? null,
      target_high: t.targetHigh ?? null,
      target_low: t.targetLow ?? null,
    };
  } catch {
    return { target_consensus: null, target_high: null, target_low: null };
  }
}
