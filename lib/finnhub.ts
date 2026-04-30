const BASE_URL = "https://finnhub.io/api/v1";
const token = () => process.env.FINNHUB_API_KEY ?? "";

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
  // Returns: { c: price, d: change, dp: change%, h, l, o, pc, t }
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
