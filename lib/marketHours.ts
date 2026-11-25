// US market sessions, including holidays and 13:00 early closes.

const TIME_ZONE = "America/New_York";
const OPEN = 9 * 60 + 30; // minutes after midnight, ET
const CLOSE = 16 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/** ET date → trading hours that day, "09:30-13:00", or "" when closed. */
export type MarketHolidays = Map<string, string>;

export interface MarketSession {
  /** YYYY-MM-DD in New York. */
  date: string;
  openAt: number;
  closeAt: number;
}

// Without the list we fall back to plain weekdays, which is right on all but
// about a dozen days a year.
export async function getMarketHolidays(): Promise<MarketHolidays> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return new Map();

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/market-holiday?exchange=US&token=${apiKey}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return new Map();
    const body: { data?: { atDate: string; tradingHour: string }[] } =
      await res.json();
    return new Map((body.data ?? []).map((h) => [h.atDate, h.tradingHour]));
  } catch {
    return new Map();
  }
}

function etDate(time: number): string {
  // en-CA formats as YYYY-MM-DD.
  return new Date(time).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

// Clocks only change at 2am on a Sunday, so the offset at noon UTC holds for
// the whole session.
function etToUtc(date: string, minutes: number): number {
  const noonUtc = Date.parse(`${date}T12:00:00Z`);
  const hourInEt = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(noonUtc)
  );
  return noonUtc - hourInEt * 60 * 60 * 1000 + minutes * 60 * 1000;
}

function sessionOn(
  date: string,
  holidays: MarketHolidays
): MarketSession | null {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return null;

  let [open, close] = [OPEN, CLOSE];
  const hours = holidays.get(date);
  if (hours !== undefined) {
    const match = hours.match(/^(\d\d):(\d\d)-(\d\d):(\d\d)$/);
    if (!match) return null; // closed all day
    const [h1, m1, h2, m2] = match.slice(1).map(Number);
    [open, close] = [h1 * 60 + m1, h2 * 60 + m2];
  }
  return { date, openAt: etToUtc(date, open), closeAt: etToUtc(date, close) };
}

/** The session in progress at `time`, or the last one before it. */
export function latestSession(
  time: number,
  holidays: MarketHolidays
): MarketSession | null {
  const noon = Date.parse(`${etDate(time)}T12:00:00Z`);
  for (let back = 0; back < 10; back++) {
    const date = new Date(noon - back * DAY_MS).toISOString().slice(0, 10);
    const session = sessionOn(date, holidays);
    if (session && session.openAt <= time) return session;
  }
  return null;
}

export function isOpenAt(time: number, session: MarketSession | null): boolean {
  return session !== null && time >= session.openAt && time < session.closeAt;
}
