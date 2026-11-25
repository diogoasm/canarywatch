import { calculatePnL, daysUntil } from "@/lib/utils";
import type { CanaryStatus } from "@/types";

// What each canary colour means, in one place: the thresholds, the status they
// produce, the reason shown beside a holding, and the key on the homepage and
// the watchlist. The wording is built from the thresholds, so they can't drift.

const RED_EARNINGS_DAYS = 7;
const YELLOW_EARNINGS_DAYS = 21;
const DROP_PERCENT = 10;
const GAIN_PERCENT = 10;

const WEEKS = ["", "a week", "two weeks", "three weeks", "four weeks"];

function within(days: number): string {
  return `within ${(days % 7 === 0 && WEEKS[days / 7]) || `${days} days`}`;
}

interface CanaryMeaning {
  label: string;
  /** What triggers it. Grey has no trigger. */
  rule?: string;
  /** The same, short enough for the one-line key on the watchlist. */
  shortRule?: string;
}

export const CANARY_MEANING: Record<CanaryStatus, CanaryMeaning> = {
  red: {
    label: "Act soon",
    rule: `Earnings ${within(RED_EARNINGS_DAYS)}, or down ${DROP_PERCENT}% or more from your cost`,
    shortRule: `earnings ${within(RED_EARNINGS_DAYS)}, or down ${DROP_PERCENT}%`,
  },
  yellow: {
    label: "Keep an eye on it",
    rule: `Earnings ${within(YELLOW_EARNINGS_DAYS)}`,
    shortRule: `earnings ${within(YELLOW_EARNINGS_DAYS)}`,
  },
  green: {
    label: "Good news",
    rule: `Up ${GAIN_PERCENT}% or more from your cost`,
    shortRule: `up ${GAIN_PERCENT}%`,
  },
  grey: { label: "Nothing to flag" },
};

/** Most urgent first. */
export const CANARY_ORDER: CanaryStatus[] = ["red", "yellow", "green", "grey"];

const LOADING = "Checking the price…";
const PRICE_UNAVAILABLE = "Price unavailable right now";

function assess(
  pnlPercent: number,
  earningsDate: string | null
): { status: CanaryStatus; reason: string } {
  if (earningsDate) {
    const days = daysUntil(earningsDate);
    if (days >= 0 && days <= YELLOW_EARNINGS_DAYS) {
      return {
        status: days <= RED_EARNINGS_DAYS ? "red" : "yellow",
        reason:
          days === 0
            ? "Earnings today"
            : `Earnings in ${days} day${days === 1 ? "" : "s"}`,
      };
    }
  }

  const percent = Math.abs(pnlPercent).toFixed(0);
  if (pnlPercent <= -DROP_PERCENT) {
    return { status: "red", reason: `Down ${percent}% from your cost` };
  }
  if (pnlPercent >= GAIN_PERCENT) {
    return { status: "green", reason: `Up ${percent}% from your cost` };
  }
  return { status: "grey", reason: CANARY_MEANING.grey.label };
}

/**
 * A holding's canary and the reason for it. Pass no quote while it's loading;
 * a quote that failed has no price (or a price of 0) and stays grey.
 */
export function resolveHoldingCanary(
  holding: { shares: number; avg_buy_price: number },
  quote?: { price?: number; next_earnings_date?: string | null } | null
): { status: CanaryStatus; reason: string } {
  if (!quote) return { status: "grey", reason: LOADING };
  if (!quote.price) return { status: "grey", reason: PRICE_UNAVAILABLE };

  const { percent } = calculatePnL(
    holding.shares,
    holding.avg_buy_price,
    quote.price
  );
  return assess(percent, quote.next_earnings_date ?? null);
}
