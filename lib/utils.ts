import type { CanaryStatus } from "@/types";

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

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

export function getCanaryColor(status: CanaryStatus): string {
  switch (status) {
    case "red":
      return "#E03B3B";
    case "yellow":
      return "#F5C842";
    case "green":
      return "#2D9E6B";
    case "grey":
    default:
      return "#9CA3AF";
  }
}

export function getCanaryLabel(status: CanaryStatus): string {
  switch (status) {
    case "red":
      return "Urgent";
    case "yellow":
      return "Watch";
    case "green":
      return "Positive";
    case "grey":
    default:
      return "Neutral";
  }
}

export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Shared by every page that shows a holding's canary.
export function resolveCanaryStatus(
  pnlPercent: number,
  earningsDate: string | null
): CanaryStatus {
  if (earningsDate) {
    const days = daysUntil(earningsDate);
    if (days >= 1 && days <= 7) return "red";
    if (days >= 8 && days <= 21) return "yellow";
  }
  if (pnlPercent <= -10) return "red";
  if (pnlPercent >= 10) return "green";
  return "grey";
}

export function resolveCanaryTooltip(
  pnlPercent: number,
  earningsDate: string | null
): string {
  if (earningsDate) {
    const days = daysUntil(earningsDate);
    if (days >= 1 && days <= 7)
      return `Earnings in ${days} day${days === 1 ? "" : "s"} — decide your strategy`;
    if (days >= 8 && days <= 21)
      return `Earnings in ${days} days — plan ahead`;
  }
  if (pnlPercent <= -10)
    return `Down ${Math.abs(pnlPercent).toFixed(1)}% — significant loss`;
  if (pnlPercent >= 10) return `Up ${pnlPercent.toFixed(1)}% — strong gain`;
  return "No significant flags right now";
}

export function resolveHoldingCanary(
  holding: { shares: number; avg_buy_price: number },
  quote?: { price?: number; next_earnings_date?: string | null } | null
): { status: CanaryStatus; tooltip: string } {
  const price = quote?.price;
  if (price == null || isNaN(price)) {
    return { status: "grey", tooltip: "Fetching data…" };
  }
  const { percent } = calculatePnL(holding.shares, holding.avg_buy_price, price);
  const earningsDate = quote?.next_earnings_date ?? null;
  return {
    status: resolveCanaryStatus(percent, earningsDate),
    tooltip: resolveCanaryTooltip(percent, earningsDate),
  };
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
