import { NextRequest, NextResponse } from "next/server";
import { getNextEarnings } from "@/lib/earnings";
import { createClient } from "@/lib/supabase/server";

const MAX_TICKERS = 50;
const TICKER_PATTERN = /^[A-Z0-9.-]{1,10}$/;

// Fresh earnings dates for a saved briefing whose stored dates have passed.
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tickers = (request.nextUrl.searchParams.get("tickers") ?? "")
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter((t) => TICKER_PATTERN.test(t))
    .slice(0, MAX_TICKERS);

  if (tickers.length === 0) {
    return NextResponse.json({ error: "tickers required" }, { status: 400 });
  }

  const earnings = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        return { ticker, ...(await getNextEarnings(ticker)) };
      } catch {
        return { ticker, date: null, confirmed: false };
      }
    })
  );

  return NextResponse.json({ earnings });
}
