export type Plan = "free" | "premium";

export type CanaryStatus = "grey" | "yellow" | "red" | "green";

export interface Profile {
  id: string;
  plan: Plan;
  briefings_used: number;
  briefings_reset_at: string;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  company_name: string;
  shares: number;
  avg_buy_price: number;
  added_at: string;
  // Computed client-side from live data
  current_price?: number;
  canary_status?: CanaryStatus;
  pnl_dollars?: number;
  pnl_percent?: number;
}

export interface Briefing {
  id: string;
  user_id: string;
  content: BriefingContent;
  generated_at: string;
  type: "portfolio" | "single";
  ticker: string | null;
}

export interface BriefingContent {
  portfolio_snapshot: {
    total_invested: number;
    current_value: number;
    overall_pnl_percent: number;
    best_performer: { ticker: string; pnl_percent: number };
    worst_performer: { ticker: string; pnl_percent: number };
  };
  key_dates: Array<{
    ticker: string;
    company_name: string;
    earnings_date: string;
    days_until: number;
  }>;
  canary_warnings: Array<{
    ticker: string;
    message: string;
    severity: CanaryStatus;
  }>;
  market_context: string;
  outlook: Array<{
    ticker: string;
    summary: string;
    upside_percent: number | null;
    analyst_target: number | null;
  }>;
  disclaimer: string;
}

export interface StockSearchResult {
  ticker: string;
  company_name: string;
  exchange: string;
}

export interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
}
