import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey || apiKey === "your_alpha_vantage_api_key") {
    return NextResponse.json(
      { error: "Alpha Vantage API key not configured", ticker },
      { status: 503 }
    );
  }

  try {
    const [quoteRes, earningsRes] = await Promise.all([
      fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`,
        { next: { revalidate: 300 } } // cache 5 min
      ),
      fetch(
        `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${ticker}&horizon=3month&apikey=${apiKey}`,
        { next: { revalidate: 3600 } } // cache 1 hour
      ),
    ]);

    const quoteData = await quoteRes.json();
    const earningsCsv = await earningsRes.text();

    const quote = quoteData["Global Quote"];

    if (!quote || !quote["05. price"]) {
      return NextResponse.json({
        error: "No quote data — API rate limit may be reached",
        ticker,
      });
    }

    const price = parseFloat(quote["05. price"]);
    const changeRaw = (quote["10. change percent"] ?? "0%")
      .replace("%", "")
      .replace("+", "");
    const change_percent = parseFloat(changeRaw) || 0;

    // EARNINGS_CALENDAR returns CSV: symbol,name,reportDate,fiscalDateEnding,estimate,currency
    let next_earnings_date: string | null = null;
    const today = new Date().toISOString().split("T")[0];
    const lines = earningsCsv.split("\n").filter(Boolean);

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      const reportDate = parts[2]?.trim();
      if (reportDate && reportDate >= today) {
        next_earnings_date = reportDate;
        break;
      }
    }

    return NextResponse.json({ ticker, price, change_percent, next_earnings_date });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch stock data", ticker },
      { status: 500 }
    );
  }
}
