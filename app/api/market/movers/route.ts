import { NextResponse } from "next/server";

const STABLE_URL = "https://financialmodelingprep.com/stable";
const MIN_PRICE = 2;
const LIST_SIZE = 8;

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

// Returns null on failure, so one bad list doesn't take down the others.
async function fetchList(
  endpoint: string,
  apiKey: string
): Promise<FmpMover[] | null> {
  try {
    const res = await fetch(`${STABLE_URL}/${endpoint}?apikey=${apiKey}`, {
      next: { revalidate: 600 }, // cache 10 min
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return null;

    return (data as FmpMover[])
      .filter(isCommonStock)
      .slice(0, LIST_SIZE)
      .map(({ symbol, name, price, change, changesPercentage }) => ({
        symbol,
        name,
        price,
        change,
        changesPercentage,
      }));
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

  const [gainers, losers, mostActive] = await Promise.all([
    fetchList("biggest-gainers", apiKey),
    fetchList("biggest-losers", apiKey),
    fetchList("most-actives", apiKey),
  ]);

  if (!gainers && !losers && !mostActive) {
    return NextResponse.json(
      { error: "Failed to fetch market movers" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    gainers: gainers ?? [],
    losers: losers ?? [],
    mostActive: mostActive ?? [],
    updatedAt: new Date().toISOString(),
  });
}
