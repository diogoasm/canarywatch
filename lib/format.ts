// The one place dollar amounts are formatted, so every page reads the same:
// $21,584.78, +$2,140.30, −$284.72.

// A true minus sign (U+2212), which lines up with "+" in DM Mono and is read
// as "minus" by screen readers.
const MINUS = "−";

const TWO_DECIMALS = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function sign(value: number, signed: boolean): string {
  if (value < 0) return MINUS;
  return signed && value > 0 ? "+" : "";
}

/** $1,234.56. With `signed`, gains get a "+"; losses always get "−". */
export function formatMoney(
  value: number,
  { signed = false }: { signed?: boolean } = {}
): string {
  return `${sign(value, signed)}$${TWO_DECIMALS.format(Math.abs(value))}`;
}

/** Large amounts in short form for charts: $51.55B, $230M, $12K. */
export function formatMoneyCompact(value: number): string {
  const abs = Math.abs(value);
  const s = sign(value, false);
  if (abs >= 1e9) return `${s}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${s}$${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${s}$${(abs / 1e3).toFixed(0)}K`;
  return `${s}$${abs.toFixed(0)}`;
}

/** +12.34% / −8.68%, with the same minus sign as the money figures. */
export function formatPercent(
  value: number,
  { signed = true }: { signed?: boolean } = {}
): string {
  return `${sign(value, signed)}${TWO_DECIMALS.format(Math.abs(value))}%`;
}
