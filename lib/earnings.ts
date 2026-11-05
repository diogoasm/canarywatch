import { getEarningsCalendar, type EarningsData } from "@/lib/fmp";
import {
  getRecentEarnings,
  getUpcomingEarnings,
  type FhRecentEarning,
  type FhUpcomingEarning,
} from "@/lib/finnhub";

export interface NextEarnings {
  date: string | null;
  confirmed: boolean;
}

const ESTIMATE_INTERVAL_DAYS = 91;

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// FMP → Finnhub upcoming → Finnhub +91d estimate. Never returns a date that has
// already passed.
export function pickNextEarnings(
  fmp: EarningsData,
  upcoming: FhUpcomingEarning[],
  recent: FhRecentEarning[]
): NextEarnings {
  const today = new Date().toISOString().split("T")[0];

  if (fmp.next_date !== null && fmp.next_date >= today) {
    return { date: fmp.next_date, confirmed: fmp.confirmed };
  }

  const next = upcoming.find((e) => e.date >= today);
  if (next) return { date: next.date, confirmed: true };

  if (recent.length > 0 && recent[0].period) {
    // `period` is the quarter end of the last report, so until the next report
    // lands this estimate can already be behind us. Roll it forward.
    let date = addDays(recent[0].period, ESTIMATE_INTERVAL_DAYS);
    while (date < today) date = addDays(date, ESTIMATE_INTERVAL_DAYS);
    return { date, confirmed: false };
  }

  return { date: null, confirmed: false };
}

export async function getNextEarnings(ticker: string): Promise<NextEarnings> {
  const [fmp, upcoming, recent] = await Promise.all([
    getEarningsCalendar(ticker),
    getUpcomingEarnings(ticker),
    getRecentEarnings(ticker),
  ]);
  return pickNextEarnings(fmp, upcoming, recent);
}
