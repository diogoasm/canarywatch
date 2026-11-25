// Shared by /api/market/movers and the MarketMovers table.

export interface Mover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

export type MoverListKey = "gainers" | "losers" | "mostActive";

/** Rows in a full list. */
export const LIST_SIZE = 8;

export interface MoverList {
  movers: Mover[];
  /** From the session that is open right now. */
  live: boolean;
  /** When the prices were taken, or null if unknown. */
  asOf: string | null;
  /** When the session those prices belong to closes or closed. */
  closeAt: string | null;
}

export type MoversData = Record<MoverListKey, MoverList>;
