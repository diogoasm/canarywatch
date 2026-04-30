"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CanaryIcon from "@/components/CanaryIcon";
import type { CanaryStatus, StockSearchResult, WatchlistItem } from "@/types";
import { calculatePnL, daysUntil } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

interface QuoteData {
  price: number;
  change_percent: number;
  next_earnings_date: string | null;
  error?: string;
}

// ─── Canary flag logic ─────────────────────────────────────────────────────

function resolveCanaryStatus(
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

function resolveCanaryTooltip(
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

// ─── Canary icon with tooltip ──────────────────────────────────────────────

function CanaryWithTooltip({
  status,
  tooltip,
}: {
  status: CanaryStatus;
  tooltip: string;
}) {
  return (
    <div className="relative group inline-flex items-center">
      <CanaryIcon status={status} size={20} />
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="hidden group-hover:block bg-[#1A1A1A] text-white font-body text-xs rounded-md px-3 py-1.5 whitespace-nowrap shadow-xl">
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1A1A1A]" />
          {tooltip}
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton row ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-border animate-pulse">
      <div className="w-5 h-5 rounded-full bg-border shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-3.5 bg-border rounded w-14 mb-1.5" />
        <div className="h-3 bg-border rounded w-36" />
      </div>
      <div className="h-4 bg-border rounded w-16 hidden sm:block" />
      <div className="h-4 bg-border rounded w-12 hidden md:block" />
      <div className="h-4 bg-border rounded w-16 hidden md:block" />
      <div className="h-4 bg-border rounded w-20 hidden sm:block" />
      <div className="h-4 bg-border rounded w-16" />
      <div className="w-8 h-8 bg-border rounded-lg shrink-0" />
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 gap-4">
      <svg
        width="52"
        height="52"
        viewBox="0 0 24 24"
        fill="none"
        className="opacity-20"
      >
        <ellipse cx="12" cy="13" rx="6" ry="5" fill="#6B6B6B" />
        <circle cx="15.5" cy="8.5" r="3.5" fill="#6B6B6B" />
        <ellipse cx="9" cy="13" rx="3.5" ry="2.5" fill="#6B6B6B" opacity="0.7" />
        <polygon points="18.5,8 21,9 18.5,10" fill="#1A1A1A" opacity="0.4" />
        <circle cx="16.5" cy="7.8" r="0.8" fill="#1A1A1A" opacity="0.6" />
        <path
          d="M6 15 Q4 17 3 20 Q5 18 7 17"
          stroke="#6B6B6B"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <div className="text-center">
        <h3 className="font-display text-xl text-text-primary mb-1">
          Your watchlist is empty
        </h3>
        <p className="font-body text-sm text-text-secondary">
          Search for a stock above to get started
        </p>
      </div>
    </div>
  );
}

// ─── Stock search bar ──────────────────────────────────────────────────────

function StockSearch({
  onSelect,
}: {
  onSelect: (result: StockSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/stock/search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(result: StockSearchResult) {
    onSelect(result);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
          {searching ? (
            <svg
              className="animate-spin w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.2"
              />
              <path
                d="M12 2a10 10 0 0110 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M11 11l3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
        <input
          type="text"
          placeholder="Search by ticker or company name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-lg font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-canary transition-colors shadow-card"
        />
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-lg shadow-card-hover z-30 overflow-hidden">
          {results.map((result) => (
            <button
              key={result.ticker}
              onClick={() => handleSelect(result)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background transition-colors border-b border-border last:border-0"
            >
              <span className="font-mono text-sm font-bold text-text-primary w-16 shrink-0">
                {result.ticker}
              </span>
              <span className="font-body text-sm text-text-secondary truncate flex-1">
                {result.company_name}
              </span>
              <span className="font-body text-xs text-text-secondary shrink-0">
                {result.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add stock form ────────────────────────────────────────────────────────

function AddStockForm({
  selected,
  onAdd,
  onCancel,
}: {
  selected: StockSearchResult;
  onAdd: (shares: number, avgBuyPrice: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [shares, setShares] = useState("");
  const [avgBuyPrice, setAvgBuyPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(avgBuyPrice);

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError("Enter a valid number of shares.");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Enter a valid buy price.");
      return;
    }

    setSaving(true);
    try {
      await onAdd(sharesNum, priceNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stock. Check the console for details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 mt-3 border-t-2 border-t-canary">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-bold text-text-primary">
            {selected.ticker}
          </span>
          <span className="font-body text-sm text-text-secondary">
            {selected.company_name}
          </span>
        </div>
        <button
          onClick={onCancel}
          className="text-text-secondary hover:text-text-primary transition-colors p-1"
          aria-label="Cancel"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 2l10 10M12 2L2 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 items-end"
      >
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="font-body text-xs font-medium text-text-secondary uppercase tracking-wide">
            Shares held
          </label>
          <input
            type="number"
            step="any"
            min="0.0001"
            placeholder="e.g. 100"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg font-mono text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-canary transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label className="font-body text-xs font-medium text-text-secondary uppercase tracking-wide">
            Average buy price (€)
          </label>
          <input
            type="number"
            step="any"
            min="0.0001"
            placeholder="e.g. 142.50"
            value={avgBuyPrice}
            onChange={(e) => setAvgBuyPrice(e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg font-mono text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-canary transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-positive text-white font-body text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
        >
          {saving ? "Adding…" : "Add to Watchlist"}
        </button>
      </form>

      {error && (
        <p className="font-body text-xs text-urgent mt-2">{error}</p>
      )}
    </div>
  );
}

// ─── Watchlist row ─────────────────────────────────────────────────────────

function WatchlistRow({
  item,
  quote,
  onDelete,
}: {
  item: WatchlistItem;
  quote: QuoteData | null | "loading";
  onDelete: (id: string) => void;
}) {
  const isLoading = quote === "loading";
  const price = !isLoading && quote ? quote.price : null;
  const earningsDate = !isLoading && quote ? quote.next_earnings_date : null;

  const pnl =
    price !== null
      ? calculatePnL(item.shares, item.avg_buy_price, price)
      : null;

  const status: CanaryStatus =
    pnl ? resolveCanaryStatus(pnl.percent, earningsDate) : "grey";
  const tooltip =
    pnl ? resolveCanaryTooltip(pnl.percent, earningsDate) : "Fetching data…";

  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-white/50 transition-colors group">
      {/* Canary status */}
      <div className="shrink-0 w-6">
        {isLoading ? (
          <div className="w-5 h-5 rounded-full bg-border animate-pulse" />
        ) : (
          <CanaryWithTooltip status={status} tooltip={tooltip} />
        )}
      </div>

      {/* Ticker + name */}
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm font-bold text-text-primary">
          {item.ticker}
        </p>
        <p className="font-body text-xs text-text-secondary truncate">
          {item.company_name}
        </p>
      </div>

      {/* Current price */}
      <div className="text-right hidden sm:block w-20 shrink-0">
        {isLoading ? (
          <div className="h-3.5 bg-border rounded w-14 ml-auto animate-pulse" />
        ) : price !== null ? (
          <>
            <p className="font-mono text-sm text-text-primary">
              ${price.toFixed(2)}
            </p>
            {!isLoading && quote && quote.change_percent !== 0 && (
              <p
                className={`font-mono text-xs ${
                  quote.change_percent >= 0 ? "text-positive" : "text-urgent"
                }`}
              >
                {quote.change_percent >= 0 ? "+" : ""}
                {quote.change_percent.toFixed(2)}%
              </p>
            )}
          </>
        ) : (
          <p className="font-mono text-sm text-text-secondary">—</p>
        )}
      </div>

      {/* Shares */}
      <div className="text-right hidden md:block w-16 shrink-0">
        <p className="font-mono text-sm text-text-secondary">{item.shares}</p>
        <p className="font-body text-xs text-text-secondary">shares</p>
      </div>

      {/* Avg buy price */}
      <div className="text-right hidden md:block w-20 shrink-0">
        <p className="font-mono text-sm text-text-secondary">
          ${item.avg_buy_price.toFixed(2)}
        </p>
        <p className="font-body text-xs text-text-secondary">avg cost</p>
      </div>

      {/* P&L $ */}
      <div className="text-right hidden sm:block w-24 shrink-0">
        {isLoading ? (
          <div className="h-3.5 bg-border rounded w-16 ml-auto animate-pulse" />
        ) : pnl !== null ? (
          <p
            className={`font-mono text-sm font-medium ${
              pnl.dollars >= 0 ? "text-positive" : "text-urgent"
            }`}
          >
            {pnl.dollars >= 0 ? "+" : "-"}$
            {Math.abs(pnl.dollars).toFixed(2)}
          </p>
        ) : (
          <p className="font-mono text-sm text-text-secondary">—</p>
        )}
      </div>

      {/* P&L % */}
      <div className="text-right w-16 shrink-0">
        {isLoading ? (
          <div className="h-3.5 bg-border rounded w-12 ml-auto animate-pulse" />
        ) : pnl !== null ? (
          <p
            className={`font-mono text-sm font-bold ${
              pnl.percent >= 0 ? "text-positive" : "text-urgent"
            }`}
          >
            {pnl.percent >= 0 ? "+" : ""}
            {pnl.percent.toFixed(2)}%
          </p>
        ) : (
          <p className="font-mono text-sm text-text-secondary">—</p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-urgent hover:bg-[#FDF2F2] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Remove from watchlist"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1.5 3.5h11M5.5 3.5V2.5h3v1M2.5 3.5l1 8a1 1 0 001 .9h6a1 1 0 001-.9l1-8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

// ─── Column header row ─────────────────────────────────────────────────────

function ColumnHeaders() {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-background/60">
      <div className="w-6 shrink-0" />
      <div className="flex-1 font-body text-xs font-medium text-text-secondary uppercase tracking-wide">
        Stock
      </div>
      <div className="text-right hidden sm:block w-20 shrink-0 font-body text-xs font-medium text-text-secondary uppercase tracking-wide">
        Price
      </div>
      <div className="text-right hidden md:block w-16 shrink-0 font-body text-xs font-medium text-text-secondary uppercase tracking-wide">
        Shares
      </div>
      <div className="text-right hidden md:block w-20 shrink-0 font-body text-xs font-medium text-text-secondary uppercase tracking-wide">
        Avg Cost
      </div>
      <div className="text-right hidden sm:block w-24 shrink-0 font-body text-xs font-medium text-text-secondary uppercase tracking-wide">
        P&amp;L $
      </div>
      <div className="text-right w-16 shrink-0 font-body text-xs font-medium text-text-secondary uppercase tracking-wide">
        P&amp;L %
      </div>
      <div className="w-8 shrink-0" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteData | "loading">>({});
  const [loadingList, setLoadingList] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // Fetch watchlist from Supabase
  const fetchWatchlist = useCallback(async () => {
    const supabase = createClient();

    // Verify auth before querying — surfaces session issues immediately
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("[watchlist] auth →", user ? `uid: ${user.id}` : "no user", userError ?? "");
    if (!user) {
      setListError(`Not authenticated${userError ? `: ${userError.message}` : ". Try logging in again."}`);
      setLoadingList(false);
      return;
    }

    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .order("added_at", { ascending: true });

    if (error) {
      console.error("[watchlist] fetch error →", error);
      setListError(`Supabase error: ${error.message} (code: ${error.code})`);
      setLoadingList(false);
      return;
    }

    const loaded = data ?? [];
    setItems(loaded);
    setLoadingList(false);

    // Mark all as loading quotes, then fetch
    if (loaded.length > 0) {
      const loadingMap: Record<string, "loading"> = {};
      loaded.forEach((i) => (loadingMap[i.ticker] = "loading"));
      setQuotes(loadingMap);

      const fetched = await Promise.all(
        loaded.map(async (item) => {
          try {
            const res = await fetch(`/api/stock/quote?ticker=${item.ticker}`);
            const data: QuoteData = await res.json();
            return { ticker: item.ticker, data };
          } catch {
            return {
              ticker: item.ticker,
              data: { price: 0, change_percent: 0, next_earnings_date: null, error: "Failed" },
            };
          }
        })
      );

      const quoteMap: Record<string, QuoteData> = {};
      fetched.forEach(({ ticker, data }) => (quoteMap[ticker] = data));
      setQuotes(quoteMap);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  async function handleAddStock(shares: number, avgBuyPrice: number) {
    if (!selectedStock) return;
    const supabase = createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user) {
      const msg = `Not authenticated${userError ? `: ${userError.message}` : ""}`;
      console.error("[watchlist] handleAddStock — no user:", userError);
      throw new Error(msg);
    }

    console.log("[watchlist] inserting:", selectedStock.ticker, "for uid:", user.id);

    const { error } = await supabase.from("watchlist").insert({
      user_id: user.id,
      ticker: selectedStock.ticker,
      company_name: selectedStock.company_name,
      shares,
      avg_buy_price: avgBuyPrice,
    });

    if (error) {
      console.error("[watchlist] insert error →", error);
      throw new Error(`${error.message} (code: ${error.code})`);
    }

    setSelectedStock(null);
    await fetchWatchlist();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("watchlist").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // Portfolio totals from live quote data
  const totals = items.reduce(
    (acc, item) => {
      const q = quotes[item.ticker];
      const price = q && q !== "loading" && !q.error ? q.price : null;
      acc.invested += item.shares * item.avg_buy_price;
      if (price) acc.currentValue += item.shares * price;
      return acc;
    },
    { invested: 0, currentValue: 0 }
  );

  const totalPnL = totals.currentValue - totals.invested;
  const totalPnLPct =
    totals.invested > 0 ? (totalPnL / totals.invested) * 100 : 0;
  const hasLiveData =
    Object.values(quotes).some((q) => q !== "loading" && !("error" in q));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            My Watchlist
          </h1>
          <p className="font-body text-sm text-text-secondary mt-1">
            Your portfolio, watched.
          </p>
        </div>

        {hasLiveData && items.length > 0 && (
          <div className="text-left sm:text-right">
            <p className="font-mono text-xl font-bold text-text-primary">
              ${totals.currentValue.toFixed(2)}
            </p>
            <p
              className={`font-mono text-sm font-semibold ${
                totalPnL >= 0 ? "text-positive" : "text-urgent"
              }`}
            >
              {totalPnL >= 0 ? "+" : "-"}${Math.abs(totalPnL).toFixed(2)}{" "}
              <span className="text-xs font-normal">
                ({totalPnLPct >= 0 ? "+" : ""}
                {totalPnLPct.toFixed(2)}%)
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── Search ── */}
      <div className="mb-6">
        <StockSearch onSelect={setSelectedStock} />

        {selectedStock && (
          <AddStockForm
            selected={selectedStock}
            onAdd={handleAddStock}
            onCancel={() => setSelectedStock(null)}
          />
        )}
      </div>

      {/* ── Error ── */}
      {listError && (
        <p className="font-body text-sm text-urgent bg-[#FDF2F2] border border-[#FAD4D4] rounded-lg px-4 py-3 mb-4">
          {listError}
        </p>
      )}

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {loadingList ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ColumnHeaders />
            {items.map((item) => (
              <WatchlistRow
                key={item.id}
                item={item}
                quote={quotes[item.ticker] ?? null}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
