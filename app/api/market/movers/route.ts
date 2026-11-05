import { NextResponse } from "next/server";

const STABLE_URL = "https://financialmodelingprep.com/stable";
const MIN_PRICE = 2;
const LIST_SIZE = 8;
// Moves beyond these are almost always reverse splits or bad data.
const MAX_GAIN_PCT = 200;
const MAX_LOSS_PCT = -90;

interface FmpMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

// FMP sends no security-type field, and these lists are full of leveraged ETFs
// and ETNs, so the name is the only signal. "Trust" alone can't be matched:
// REITs use it too. Issuers are listed because some of their funds carry no
// "ETF" in the name (e.g. "ProShares UltraPro QQQ").
const NON_STOCK_NAME =
  /\b(ETFs?|ETNs?|funds?|warrants?|units?|rights?|preferred|notes|ProShares|Direxion|iShares|SPDR|Grayscale|QQQ)\b/i;

// Nasdaq marks these with a fifth letter: W warrant, U unit, R right. Caught
// here as well because FMP truncates some names.
const DERIVATIVE_SYMBOL = /^[A-Z]{4}[WUR]$/;

function isCommonStock({ symbol, name, price }: FmpMover): boolean {
  return (
    price >= MIN_PRICE &&
    /^[A-Z]{1,5}$/.test(symbol) &&
    !DERIVATIVE_SYMBOL.test(symbol) &&
    !NON_STOCK_NAME.test(name)
  );
}

function isPlausibleMove({ changesPercentage }: FmpMover): boolean {
  return changesPercentage <= MAX_GAIN_PCT && changesPercentage >= MAX_LOSS_PCT;
}

interface MoverList {
  movers: FmpMover[];
  fetchedAt: number;
}

// Returns null on failure, so one bad list doesn't take down the others.
async function fetchList(
  endpoint: string,
  apiKey: string
): Promise<MoverList | null> {
  try {
    const res = await fetch(`${STABLE_URL}/${endpoint}?apikey=${apiKey}`, {
      next: { revalidate: 1800 }, // cache 30 min
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return null;

    const movers = (data as FmpMover[])
      .filter(isCommonStock)
      .filter(isPlausibleMove)
      .slice(0, LIST_SIZE)
      .map(({ symbol, name, price, change, changesPercentage }) => ({
        symbol,
        name,
        price,
        change,
        changesPercentage,
      }));

    // FMP's Date header, not the clock: a cached fetch can return hours-old
    // data (builds reuse it), but it keeps the headers of the original
    // response. No header means unknown age, so 0 can never read as live.
    return { movers, fetchedAt: Date.parse(res.headers.get("date") ?? "") || 0 };
  } catch {
    return null;
  }
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FMP API key not configured" },
      { status: 503 }
    );
  }

  const lists = await Promise.all([
    fetchList("biggest-gainers", apiKey),
    fetchList("biggest-losers", apiKey),
    fetchList("most-actives", apiKey),
  ]);
  const [gainers, losers, mostActive] = lists;

  const loaded = lists.filter((list): list is MoverList => list !== null);
  if (loaded.length === 0) {
    return NextResponse.json(
      { error: "Failed to fetch market movers" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    gainers: gainers?.movers ?? [],
    losers: losers?.movers ?? [],
    mostActive: mostActive?.movers ?? [],
    // The oldest list sets the time, so it never overstates freshness.
    updatedAt: new Date(
      Math.min(...loaded.map((list) => list.fetchedAt))
    ).toISOString(),
  });
}
