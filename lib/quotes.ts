// The watchlist, the advisor and the tab icon all want the same quotes at the
// same moment. Sharing them keeps a page load to one request per ticker, which
// matters because Finnhub allows 60 calls a minute.
const QUOTE_TTL_MS = 60_000;

const recent = new Map<string, { fetchedAt: number; quote: Promise<unknown> }>();

export function fetchQuote<T>(ticker: string): Promise<T> {
  const hit = recent.get(ticker);
  if (hit && Date.now() - hit.fetchedAt < QUOTE_TTL_MS) {
    return hit.quote as Promise<T>;
  }

  const quote = fetch(`/api/stock/quote?ticker=${ticker}`).then(async (res) => {
    const body = await res.json();
    if (body.error) recent.delete(ticker);
    return body;
  });
  quote.catch(() => recent.delete(ticker));

  recent.set(ticker, { fetchedAt: Date.now(), quote });
  return quote as Promise<T>;
}
