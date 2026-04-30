import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey || apiKey === "your_alpha_vantage_api_key") {
    return NextResponse.json({
      results: [],
      error: "Alpha Vantage API key not configured",
    });
  }

  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`,
      { next: { revalidate: 0 } }
    );
    const data = await res.json();

    const results = (data.bestMatches ?? [])
      .filter((m: Record<string, string>) => m["3. type"] === "Equity")
      .slice(0, 6)
      .map((match: Record<string, string>) => ({
        ticker: match["1. symbol"],
        company_name: match["2. name"],
        exchange: match["4. region"],
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "Failed to search stocks" });
  }
}
