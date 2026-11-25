// Money and percentages are formatted in lib/format.ts.

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function calculatePnL(
  shares: number,
  avgBuyPrice: number,
  currentPrice: number
): { dollars: number; percent: number } {
  const costBasis = shares * avgBuyPrice;
  const currentValue = shares * currentPrice;
  const dollars = currentValue - costBasis;
  const percent = costBasis > 0 ? (dollars / costBasis) * 100 : 0;
  return { dollars, percent };
}

export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
