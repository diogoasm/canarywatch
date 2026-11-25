import { NextResponse } from "next/server";
import {
  getMarketHolidays,
  isOpenAt,
  latestSession,
  type MarketHolidays,
} from "@/lib/marketHours";
import {
  LIST_SIZE,
  type Mover,
  type MoverList,
  type MoverListKey,
  type MoversData,
} from "@/lib/movers";
import {
  readSnapshots,
  saveSnapshots,
  type MoversSnapshot,
} from "@/lib/moversSnapshot";

// Whether the market is open changes the answer, so this runs per request. The
// FMP calls inside are still cached for 30 minutes (250 calls a day on the
// free plan).
export const dynamic = "force-dynamic";

const STABLE_URL = "https://financialmodelingprep.com/stable";
// Above $10 only: keeps penny and near-penny stocks off the homepage and
// the watchlist. FMP's free plan has no market cap for most of these symbols,
// so price is the filter.
const MIN_PRICE = 10;
// Moves beyond these are almost always reverse splits or bad data.
const MAX_GAIN_PCT = 200;
const MAX_LOSS_PCT = -90;
// FMP returns 50 rows and the filters can leave one or two of them. A snapshot
// is worth keeping from half a table up; a fuller one replaces it.
const MIN_SNAPSHOT_ROWS = LIST_SIZE / 2;
// For a while after the open FMP can still be sending yesterday's list.
const SETTLE_MS = 30 * 60 * 1000;

const ENDPOINTS: Record<MoverListKey, string> = {
  gainers: "biggest-gainers",
  losers: "biggest-losers",
  mostActive: "most-actives",
};
const KEYS = Object.keys(ENDPOINTS) as MoverListKey[];

// FMP sends no security-type field, and these lists are full of leveraged ETFs
// and ETNs, so the name is the only signal. "Trust" alone can't be matched:
// REITs use it too. Issuers are listed because some of their funds carry no
// "ETF" in the name (e.g. "ProShares UltraPro QQQ").
const NON_STOCK_NAME =
  /\b(ETFs?|ETNs?|funds?|warrants?|units?|rights?|preferred|notes|ProShares|Direxion|iShares|SPDR|Grayscale|QQQ)\b/i;

// Nasdaq marks these with a fifth letter: W warrant, U unit, R right. Caught
// here as well because FMP truncates some names.
const DERIVATIVE_SYMBOL = /^[A-Z]{4}[WUR]$/;

function isCommonStock({ symbol, name, price }: Mover): boolean {
  return (
    price > MIN_PRICE &&
    /^[A-Z]{1,5}$/.test(symbol) &&
    !DERIVATIVE_SYMBOL.test(symbol) &&
    !NON_STOCK_NAME.test(name)
  );
}

function isPlausibleMove({ changesPercentage }: Mover): boolean {
  return changesPercentage <= MAX_GAIN_PCT && changesPercentage >= MAX_LOSS_PCT;
}

interface FetchedList {
  movers: Mover[];
  fetchedAt: number;
}

// Returns null on failure, so one bad list doesn't take down the others.
async function fetchList(
  endpoint: string,
  apiKey: string
): Promise<FetchedList | null> {
  try {
    const res = await fetch(`${STABLE_URL}/${endpoint}?apikey=${apiKey}`, {
      next: { revalidate: 1800 }, // cache 30 min
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return null;

    const movers = (data as Mover[])
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
    // data, but it keeps the headers of the original response. No header means
    // unknown age, so 0 can never read as live.
    return { movers, fetchedAt: Date.parse(res.headers.get("date") ?? "") || 0 };
  } catch {
    return null;
  }
}

/** The list as a snapshot, if it was taken while the market was trading. */
function toSnapshot(
  list: MoverListKey,
  fetched: FetchedList | null,
  holidays: MarketHolidays
): MoversSnapshot | null {
  if (!fetched || fetched.movers.length < MIN_SNAPSHOT_ROWS) return null;
  const session = latestSession(fetched.fetchedAt, holidays);
  if (!session || !isOpenAt(fetched.fetchedAt, session)) return null;
  if (fetched.fetchedAt < session.openAt + SETTLE_MS) return null;

  return {
    list,
    session_date: session.date,
    taken_at: new Date(fetched.fetchedAt).toISOString(),
    movers: fetched.movers,
  };
}

// A new session always replaces the old one. Within a session the fullest list
// wins, and the latest of equally full ones.
function isBetter(next: MoversSnapshot, saved?: MoversSnapshot): boolean {
  if (!saved || next.session_date > saved.session_date) return true;
  return (
    next.session_date === saved.session_date &&
    next.movers.length >= saved.movers.length &&
    Date.parse(next.taken_at) > Date.parse(saved.taken_at)
  );
}

function toMoverList(
  movers: Mover[],
  takenAt: number,
  now: number,
  holidays: MarketHolidays
): MoverList {
  const session = takenAt ? latestSession(takenAt, holidays) : null;
  return {
    movers,
    live: isOpenAt(takenAt, session) && isOpenAt(now, session),
    asOf: takenAt ? new Date(takenAt).toISOString() : null,
    closeAt: session ? new Date(session.closeAt).toISOString() : null,
  };
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FMP API key not configured" },
      { status: 503 }
    );
  }

  const [holidays, saved, ...fetchedLists] = await Promise.all([
    getMarketHolidays(),
    readSnapshots(),
    ...KEYS.map((key) => fetchList(ENDPOINTS[key], apiKey)),
  ]);

  const now = Date.now();
  const session = latestSession(now, holidays);
  const marketOpen = isOpenAt(now, session);

  const snapshots = new Map(saved?.map((s) => [s.list, s]));
  const toSave: MoversSnapshot[] = [];
  const data = {} as MoversData;

  KEYS.forEach((key, i) => {
    const fetched = fetchedLists[i];

    const fresh = toSnapshot(key, fetched, holidays);
    if (saved && fresh && isBetter(fresh, snapshots.get(key))) {
      snapshots.set(key, fresh);
      toSave.push(fresh);
    }

    const snapshot = snapshots.get(key);
    data[key] =
      !marketOpen && snapshot && snapshot.session_date === session?.date
        ? toMoverList(
            snapshot.movers,
            Date.parse(snapshot.taken_at),
            now,
            holidays
          )
        : toMoverList(
            fetched?.movers ?? [],
            fetched?.fetchedAt ?? 0,
            now,
            holidays
          );
  });

  await saveSnapshots(toSave);

  if (KEYS.every((key) => data[key].movers.length === 0)) {
    return NextResponse.json(
      { error: "Failed to fetch market movers" },
      { status: 502 }
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
