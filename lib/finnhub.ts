const BASE_URL = "https://finnhub.io/api/v1";
const token = () => process.env.FINNHUB_API_KEY ?? "";

// ─── Existing functions (used by other pages) ──────────────────────────────

export async function searchStocks(query: string) {
  const res = await fetch(
    `${BASE_URL}/search?q=${encodeURIComponent(query)}&token=${token()}`
  );
  const data = await res.json();
  return (data.result ?? []).filter(
    (r: { type: string }) => r.type === "Common Stock"
  );
}

export async function getQuote(ticker: string) {
  const res = await fetch(
    `${BASE_URL}/quote?symbol=${ticker}&token=${token()}`
  );
  return res.json();
}

export async function getCompanyProfile(ticker: string) {
  const res = await fetch(
    `${BASE_URL}/stock/profile2?symbol=${ticker}&token=${token()}`
  );
  return res.json();
}

export async function getEarningsCalendar(ticker: string) {
  const res = await fetch(
    `${BASE_URL}/calendar/earnings?symbol=${ticker}&token=${token()}`
  );
  const data = await res.json();
  return data.earningsCalendar ?? [];
}

export async function getNewsSentiment(ticker: string) {
  const today = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const res = await fetch(
    `${BASE_URL}/company-news?symbol=${ticker}&from=${monthAgo}&to=${today}&token=${token()}`
  );
  return res.json();
}

// ─── Typed interfaces for briefing fallbacks ───────────────────────────────

export interface FhUpcomingEarning {
  date: string;
  symbol: string;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  hour: string;
}

export interface FhRecentEarning {
  actual: number | null;
  estimate: number | null;
  period: string; // "YYYY-MM-DD"
  quarter: number;
  surprise: number | null;
  surprisePercent: number | null;
}

export interface FhPriceTarget {
  targetMean: number | null;
  targetHigh: number | null;
  targetLow: number | null;
  targetMedian: number | null;
}

export interface FhBasicMetrics {
  week52High: number | null;
  week52Low: number | null;
  peRatio: number | null;
  revenueGrowthTTMYoy: number | null; // fraction: 0.15 = 15%
}

// ─── Fallback data functions ───────────────────────────────────────────────

// Confirmed upcoming earnings within the next 90 days
export async function getUpcomingEarnings(ticker: string): Promise<FhUpcomingEarning[]> {
  try {
    const t = token();
    if (!t) return [];
    const today = new Date().toISOString().split("T")[0];
    const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const res = await fetch(
      `${BASE_URL}/calendar/earnings?symbol=${ticker}&from=${today}&to=${in90}&token=${t}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const calendar: FhUpcomingEarning[] = data.earningsCalendar ?? [];
    return calendar.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

// Most recent reported earnings quarters (for date estimation + EPS fallback)
export async function getRecentEarnings(ticker: string): Promise<FhRecentEarning[]> {
  try {
    const t = token();
    if (!t) return [];
    const res = await fetch(
      `${BASE_URL}/stock/earnings?symbol=${ticker}&limit=4&token=${t}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Analyst price target from Finnhub
export async function getFinnhubPriceTarget(ticker: string): Promise<FhPriceTarget> {
  const empty: FhPriceTarget = {
    targetMean: null,
    targetHigh: null,
    targetLow: null,
    targetMedian: null,
  };
  try {
    const t = token();
    if (!t) return empty;
    const res = await fetch(
      `${BASE_URL}/stock/price-target?symbol=${ticker}&token=${t}`,
      { next: { revalidate: 86400 } }
    );
    const data = await res.json();
    return {
      targetMean: data.targetMean ?? null,
      targetHigh: data.targetHigh ?? null,
      targetLow: data.targetLow ?? null,
      targetMedian: data.targetMedian ?? null,
    };
  } catch {
    return empty;
  }
}

// Analyst recommendation trend → derived consensus string
export async function getRecommendationTrend(ticker: string): Promise<string | null> {
  try {
    const t = token();
    if (!t) return null;
    const res = await fetch(
      `${BASE_URL}/stock/recommendation?symbol=${ticker}&token=${t}`,
      { next: { revalidate: 86400 } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const r = data[0] as {
      strongBuy: number;
      buy: number;
      hold: number;
      sell: number;
      strongSell: number;
    };
    const sb = r.strongBuy ?? 0;
    const b = r.buy ?? 0;
    const h = r.hold ?? 0;
    const s = r.sell ?? 0;
    const ss = r.strongSell ?? 0;
    const total = sb + b + h + s + ss;
    if (total === 0) return null;
    if (sb / total > 0.4) return "Strong Buy";
    if ((sb + b) / total > 0.6) return "Buy";
    if (ss / total > 0.3) return "Strong Sell";
    if ((s + ss) / total > 0.5) return "Sell";
    if (h / total > 0.5) return "Hold";
    return (sb + b) > (s + ss) ? "Buy" : "Hold";
  } catch {
    return null;
  }
}

// Key fundamental metrics: 52-wk range, P/E, revenue growth
export async function getBasicMetrics(ticker: string): Promise<FhBasicMetrics> {
  const empty: FhBasicMetrics = {
    week52High: null,
    week52Low: null,
    peRatio: null,
    revenueGrowthTTMYoy: null,
  };
  try {
    const t = token();
    if (!t) return empty;
    const res = await fetch(
      `${BASE_URL}/stock/metric?symbol=${ticker}&metric=all&token=${t}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const m = data.metric ?? {};
    return {
      week52High: m["52WeekHigh"] ?? null,
      week52Low: m["52WeekLow"] ?? null,
      peRatio: m.peBasicExclExtraTTM ?? null,
      revenueGrowthTTMYoy: m.revenueGrowthTTMYoy ?? null,
    };
  } catch {
    return empty;
  }
}
