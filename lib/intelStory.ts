// The founder's Intel trade. Shared by the full chart and the one in the hero.

export interface DailyClose {
  date: string;
  close: number;
}

const BOUGHT_ON = "2026-01-27";
const SOLD_ON = "2026-04-21";
const EARNINGS_ON = "2026-04-23";
const PEAK_FROM = "2026-04-24";
const PEAK_TO = "2026-04-30";
const MAY_FROM = "2026-05-01";
const MAY_TO = "2026-05-31";

export const EARNINGS_LABEL = "Earnings";

export const CHART_COLORS = {
  ink: "#1A1A1A",
  grey: "#6B6B6B",
  green: "#2D9E6B",
  canary: "#F5C842",
  red: "#E03B3B",
  // For text: red is below 4.5:1 on the paper.
  redInk: "#C42B2B",
  rule: "#E8E4DC",
  paper: "#F7F5F0",
};

export const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);

export function formatDay(date: string): string {
  return new Date(toTime(date)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function findStory(closes: DailyClose[]) {
  const on = (date: string) => closes.find((c) => c.date === date);
  const highestBetween = (from: string, to: string) =>
    closes
      .filter((c) => c.date >= from && c.date <= to)
      .reduce<DailyClose | null>(
        (high, c) => (!high || c.close > high.close ? c : high),
        null
      );

  const bought = on(BOUGHT_ON);
  const sold = on(SOLD_ON);
  const earnings = on(EARNINGS_ON);
  const peak = highestBetween(PEAK_FROM, PEAK_TO);
  const mayHigh = highestBetween(MAY_FROM, MAY_TO);
  if (!bought || !sold || !earnings || !peak || !mayHigh) return null;

  return { bought, sold, earnings, peak, mayHigh };
}
