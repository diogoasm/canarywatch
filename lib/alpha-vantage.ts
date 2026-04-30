const BASE_URL = "https://www.alphavantage.co/query";
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

export async function searchStocks(query: string) {
  const res = await fetch(
    `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`
  );
  const data = await res.json();
  return data.bestMatches ?? [];
}

export async function getQuote(ticker: string) {
  const res = await fetch(
    `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${API_KEY}`
  );
  const data = await res.json();
  return data["Global Quote"] ?? null;
}

export async function getCompanyOverview(ticker: string) {
  const res = await fetch(
    `${BASE_URL}?function=OVERVIEW&symbol=${ticker}&apikey=${API_KEY}`
  );
  return res.json();
}

export async function getEarningsCalendar(ticker: string) {
  const res = await fetch(
    `${BASE_URL}?function=EARNINGS&symbol=${ticker}&apikey=${API_KEY}`
  );
  return res.json();
}

export async function getNewsSentiment(ticker: string) {
  const res = await fetch(
    `${BASE_URL}?function=NEWS_SENTIMENT&tickers=${ticker}&limit=10&apikey=${API_KEY}`
  );
  return res.json();
}
