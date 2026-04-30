import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || apiKey === "your_finnhub_api_key") {
    return NextResponse.json(
      { error: "Finnhub API key not configured", ticker },
      { status: 503 }
    );
  }

  try {
    const [quoteRes, earningsRes] = await Promise.all([
      fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`,
        { next: { revalidate: 300 } } // cache 5 min
      ),
      fetch(
        `https://finnhub.io/api/v1/calendar/earnings?symbol=${ticker}&token=${apiKey}`,
        { next: { revalidate: 3600 } } // cache 1 hour
      ),
    ]);

    const quoteData = await quoteRes.json();
    const earningsData = await earningsRes.json();

    // Finnhub quote: { c: current, d: change, dp: change%, h, l, o, pc, t }
    const price: number | null =
      quoteData.c != null && quoteData.c !== 0 ? quoteData.c : null;

    if (price === null) {
      return NextResponse.json({
        error: "No quote data returned — ticker may be invalid or market closed",
        ticker,
      });
    }

    const change_percent: number =
      quoteData.dp != null ? quoteData.dp : 0;

    // Finnhub earnings: { earningsCalendar: [{ date, symbol, ... }] }
    // Filter to upcoming dates only, take the nearest one
    const today = new Date().toISOString().split("T")[0];
    const upcoming = (earningsData.earningsCalendar ?? [])
      .filter((e: { date: string }) => e.date >= today)
      .sort((a: { date: string }, b: { date: string }) =>
        a.date.localeCompare(b.date)
      );

    const next_earnings_date: string | null =
      upcoming.length > 0 ? upcoming[0].date : null;

    return NextResponse.json({ ticker, price, change_percent, next_earnings_date });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch stock data", ticker },
      { status: 500 }
    );
  }
}
