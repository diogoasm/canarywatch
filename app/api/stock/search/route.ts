import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || apiKey === "your_finnhub_api_key") {
    return NextResponse.json({
      results: [],
      error: "Finnhub API key not configured",
    });
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`,
      { next: { revalidate: 0 } }
    );
    const data = await res.json();

    // Finnhub result: { symbol, displaySymbol, description, type }
    const results = (data.result ?? [])
      .filter((m: { type: string }) => m.type === "Common Stock")
      .slice(0, 6)
      .map((match: { symbol: string; description: string; displaySymbol: string }) => ({
        ticker: match.symbol,
        company_name: match.description,
        exchange: match.displaySymbol,
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "Failed to search stocks" });
  }
}
