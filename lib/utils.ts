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

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
