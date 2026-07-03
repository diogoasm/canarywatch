import { NextRequest, NextResponse } from "next/server";

const MAX_PER_TICKER = 3;
const MAX_TOTAL = 9;

export interface NewsArticle {
  ticker: string;
  headline: string;
  summary: string;
  url: string;
  datetime: number; // unix seconds
  source: string;
}

interface FinnhubArticle {
  headline?: string;
  summary?: string;
  url?: string;
  datetime?: number;
  source?: string;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const tickersParam = request.nextUrl.searchParams.get("tickers");
  if (!tickersParam) {
    return NextResponse.json({ error: "tickers required" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || apiKey === "your_finnhub_api_key") {
    return NextResponse.json(
      { error: "Finnhub API key not configured" },
      { status: 503 }
    );
  }

  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 10);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const from = formatDate(weekAgo);
  const to = formatDate(now);

  const perTicker = await Promise.all(
    tickers.map(async (ticker): Promise<NewsArticle[]> => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${apiKey}`,
          { next: { revalidate: 1800 } } // cache 30 min
        );
        if (!res.ok) return [];
        const data = (await res.json()) as FinnhubArticle[];
        if (!Array.isArray(data)) return [];
        return data
          .filter((a) => a.headline && a.url && a.datetime)
          .slice(0, MAX_PER_TICKER)
          .map((a) => ({
            ticker,
            headline: a.headline!,
            summary: a.summary ?? "",
            url: a.url!,
            datetime: a.datetime!,
            source: a.source ?? "Unknown",
          }));
      } catch {
        return [];
      }
    })
  );

  const articles = perTicker
    .flat()
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, MAX_TOTAL);

  return NextResponse.json({ articles });
}
