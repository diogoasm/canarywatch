"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { WATCHLIST_CHANGED } from "@/components/CanaryFavicon";
import CanaryStrip, { CanaryToggletip } from "@/components/CanaryStrip";
import CountUp from "@/components/CountUp";
import MarketMovers from "@/components/MarketMovers";
import StockSearch from "@/components/StockSearch";
import { fetchQuote } from "@/lib/quotes";
import type { CanaryStatus, StockSearchResult, WatchlistItem } from "@/types";
import { calculatePnL, resolveHoldingCanary } from "@/lib/utils";
import { formatMoney, formatPercent } from "@/lib/format";
import { AppPage, Masthead, SectionLabel } from "@/components/AppPage";
import Button from "@/components/Button";
import { PLAIN, reportError } from "@/lib/errors";

// ─── Types ─────────────────────────────────────────────────────────────────

interface QuoteData {
  price: number;
  change_percent: number;
  next_earnings_date: string | null;
  error?: string;
}

interface NewsArticle {
  ticker: string;
  headline: string;
  summary: string;
  url: string;
  datetime: number; // unix seconds
  source: string;
}

type NewsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; articles: NewsArticle[] };

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyState() {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 gap-4 border-b border-border">
      <motion.svg
        width="52"
        height="52"
        viewBox="0 0 24 24"
        fill="none"
        className="opacity-20"
        aria-hidden="true"
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={
          reduce
            ? undefined
            : { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }
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
      </motion.svg>
      <div className="text-center">
        <h2 className="font-display text-xl text-text-primary mb-1">
          Your watchlist is empty
        </h2>
        <p className="font-body text-sm text-text-secondary">
          Search for a stock above to add your first holding.
        </p>
      </div>
    </div>
  );
}

// ─── Holdings grid ─────────────────────────────────────────────────────────
//
// A ruled list, laid out on one grid so the columns line up row to row.
//   Phones and tablets: two lines per row.
//     canary · ticker ·············· price · Remove
//            reason ················ P&L $ · P&L %
//   lg: one row: canary · ticker/reason · price · P&L $ · P&L % · Remove
//   xl: adds shares and average cost after price.
// The ticker and its reason are two grid rows in every layout; the other
// cells span both rows from lg up, so they sit centred beside the pair.

const GRID =
  "grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] gap-x-4 gap-y-1 items-center " +
  "lg:grid-cols-[2rem_minmax(0,1fr)_6rem_7.5rem_5.5rem_4.5rem] " +
  "xl:grid-cols-[2rem_minmax(0,1fr)_6rem_4rem_6rem_7.5rem_5.5rem_4.5rem]";

const CELL = {
  canary: "col-start-1 row-start-1 lg:row-span-2",
  ticker: "col-start-2 row-start-1 min-w-0",
  reason: "col-start-2 row-start-2 min-w-0",
  price: "col-start-3 row-start-1 lg:row-span-2 text-right",
  shares: "hidden xl:block xl:col-start-4 xl:row-start-1 xl:row-span-2 text-right",
  avg: "hidden xl:block xl:col-start-5 xl:row-start-1 xl:row-span-2 text-right",
  pnl: "col-start-3 row-start-2 lg:col-start-4 lg:row-start-1 lg:row-span-2 xl:col-start-6 text-right",
  pct: "col-start-4 row-start-2 lg:col-start-5 lg:row-start-1 lg:row-span-2 xl:col-start-7 text-right",
  remove: "col-start-4 row-start-1 lg:col-start-6 lg:row-span-2 xl:col-start-8 text-right",
};

// The reason takes the colour of its canary, in the text-safe inks.
const REASON_TONE: Record<CanaryStatus, string> = {
  red: "text-urgent-ink",
  yellow: "text-gold-ink",
  green: "text-positive-ink",
  grey: "text-text-secondary",
};

const HEAD = "font-mono text-[11px] font-normal uppercase tracking-widest text-text-secondary";

// ─── Loading skeleton row ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <li aria-hidden="true" className={`${GRID} py-4 border-b border-border animate-pulse`}>
      <div className={`${CELL.canary} w-5 h-5 rounded-full bg-border`} />
      <div className={`${CELL.ticker} h-3.5 bg-border w-16`} />
      <div className={`${CELL.reason} h-3 bg-border/70 w-40`} />
      <div className={`${CELL.price} h-3.5 bg-border w-16 ml-auto`} />
      <div className={`${CELL.pnl} h-3.5 bg-border w-16 ml-auto`} />
      <div className={`${CELL.pct} h-3.5 bg-border w-12 ml-auto`} />
    </li>
  );
}

// ─── Column labels (one-row layout only) ───────────────────────────────────

function ColumnHeaders() {
  return (
    <div aria-hidden="true" className={`${GRID} hidden lg:grid pb-3`}>
      <span className={`${CELL.ticker} ${HEAD}`}>Stock</span>
      <span className={`${CELL.price} ${HEAD}`}>Price</span>
      <span className={`${CELL.shares} ${HEAD}`}>Shares</span>
      <span className={`${CELL.avg} ${HEAD}`}>Avg cost</span>
      <span className={`${CELL.pnl} ${HEAD}`}>P&amp;L $</span>
      <span className={`${CELL.pct} ${HEAD}`}>P&amp;L %</span>
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
  /** Resolves to a plain error message, or null when the stock was added. */
  onAdd: (shares: number, avgBuyPrice: number) => Promise<string | null>;
  onCancel: () => void;
}) {
  const id = useId();
  const [shares, setShares] = useState("");
  const [avgBuyPrice, setAvgBuyPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field: "shares" | "price" | null; message: string } | null>(null);
  const sharesRef = useRef<HTMLInputElement>(null);

  // Picking a stock is the reason the form opened, so the first field is
  // where the next keystroke belongs.
  useEffect(() => {
    sharesRef.current?.focus();
  }, [selected.ticker]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(avgBuyPrice);

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError({ field: "shares", message: "Enter how many shares you hold, for example 100." });
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError({ field: "price", message: "Enter the average price you paid per share, for example 142.50." });
      return;
    }

    setSaving(true);
    const message = await onAdd(sharesNum, priceNum);
    setSaving(false);
    if (message) setError({ field: null, message });
  }

  const errorId = `${id}-error`;
  const INPUT =
    "w-full px-3 py-2.5 bg-white border border-field rounded-lg font-mono text-base text-text-primary placeholder:text-text-secondary hover:border-text-primary focus:border-text-primary transition-colors aria-[invalid=true]:border-urgent-ink";

  return (
    <div className="mt-4 pt-5 pb-6 border-t-2 border-canary border-b border-b-border">
      <div className="flex items-center justify-between mb-4">
        <h2 id={`${id}-title`} className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-bold text-text-primary">
            {selected.ticker}
          </span>
          <span className="font-body text-sm font-normal text-text-secondary">
            {selected.company_name}
          </span>
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="tap text-text-secondary hover:text-text-primary transition-colors p-1"
          aria-label={`Cancel adding ${selected.ticker}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-labelledby={`${id}-title`}
        className="flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor={`${id}-shares`} className="font-body text-sm text-text-secondary">
            Shares held
          </label>
          <input
            ref={sharesRef}
            id={`${id}-shares`}
            type="number"
            inputMode="decimal"
            step="any"
            min="0.0001"
            placeholder="e.g. 100"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            aria-invalid={error?.field === "shares"}
            aria-describedby={error?.field === "shares" ? errorId : undefined}
            className={INPUT}
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor={`${id}-price`} className="font-body text-sm text-text-secondary">
            Average buy price ($)
          </label>
          <input
            id={`${id}-price`}
            type="number"
            inputMode="decimal"
            step="any"
            min="0.0001"
            placeholder="e.g. 142.50"
            value={avgBuyPrice}
            onChange={(e) => setAvgBuyPrice(e.target.value)}
            aria-invalid={error?.field === "price"}
            aria-describedby={error?.field === "price" ? errorId : undefined}
            className={INPUT}
          />
        </div>

        <Button type="submit" disabled={saving} className="shrink-0">
          {saving ? "Adding…" : "Add to watchlist"}
        </Button>
      </form>

      <p id={errorId} role="alert" className="font-body text-sm text-urgent-ink empty:hidden mt-3">
        {error?.message ?? ""}
      </p>
    </div>
  );
}

// ─── Watchlist row ─────────────────────────────────────────────────────────

function WatchlistRow({
  item,
  quote,
  onRemove,
  index,
}: {
  item: WatchlistItem;
  quote: QuoteData | null | "loading";
  onRemove: (item: WatchlistItem, viaKeyboard: boolean) => void;
  index: number;
}) {
  const reduce = useReducedMotion();
  const isLoading = quote === "loading";
  // A failed quote comes back as { price: 0, error }: treat it as no price,
  // not as a 100% loss.
  const usable = !isLoading && quote != null && !quote.error ? quote : null;
  const price: number | null =
    usable && usable.price != null && !isNaN(usable.price) ? usable.price : null;
  const changePercent: number | null =
    usable && usable.change_percent != null && !isNaN(usable.change_percent)
      ? usable.change_percent
      : null;

  const pnl =
    price !== null ? calculatePnL(item.shares, item.avg_buy_price, price) : null;

  const canary = resolveHoldingCanary(item, usable);
  const status = canary.status;
  const reason = price === null ? "Price unavailable right now" : canary.tooltip;

  // Trigger a brief colour flash on the first successful price load.
  const wasLoadingRef = useRef(isLoading);
  const [flashClass, setFlashClass] = useState<string>("");
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && price !== null && !reduce) {
      const cls =
        changePercent !== null && changePercent < 0
          ? "price-flash-down"
          : "price-flash-up";
      setFlashClass(cls);
      const t = setTimeout(() => setFlashClass(""), 420);
      return () => clearTimeout(t);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, price, changePercent, reduce]);

  const tone = (n: number) => (n >= 0 ? "text-positive-ink" : "text-urgent-ink");
  const dash = <span className="font-mono text-sm text-text-secondary">—</span>;

  return (
    <motion.li
      data-holding={item.id}
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.15 } }}
      transition={{
        duration: reduce ? 0 : 0.35,
        ease: "easeOut",
        delay: reduce ? 0 : index * 0.06,
      }}
      className={`${GRID} py-4 border-b border-border`}
    >
      {/* Canary: a button that opens the same reason shown under the ticker. */}
      <div className={CELL.canary}>
        {isLoading ? (
          <div className="w-5 h-5 rounded-full bg-border animate-pulse" />
        ) : (
          <CanaryToggletip ticker={item.ticker} status={status} reason={reason} />
        )}
      </div>

      <p className={`${CELL.ticker} flex items-baseline gap-2`}>
        <span className="font-mono text-sm font-bold text-text-primary">{item.ticker}</span>
        <span className="hidden lg:inline font-body text-xs text-text-secondary truncate">
          {item.company_name}
        </span>
      </p>

      <p className={`${CELL.reason} font-body text-xs leading-snug ${isLoading ? "text-text-secondary" : REASON_TONE[status]}`}>
        {isLoading ? (
          <span className="block h-3 w-32 bg-border/70 animate-pulse" aria-label="Loading" />
        ) : (
          reason
        )}
      </p>

      <div className={CELL.price}>
        <span className="sr-only">Price </span>
        {isLoading ? (
          <span className="block h-3.5 w-14 ml-auto bg-border animate-pulse" />
        ) : price !== null ? (
          <>
            <span className={`block font-mono text-sm text-text-primary ${flashClass}`}>
              {formatMoney(price)}
            </span>
            {changePercent !== null && changePercent !== 0 && (
              <span className={`hidden lg:block font-mono text-xs ${tone(changePercent)}`}>
                {formatPercent(changePercent)}
                <span className="sr-only"> today</span>
              </span>
            )}
          </>
        ) : (
          dash
        )}
      </div>

      <div className={CELL.shares}>
        <span className="sr-only">Shares </span>
        <span className="font-mono text-sm text-text-secondary">{item.shares}</span>
      </div>

      <div className={CELL.avg}>
        <span className="sr-only">Average cost </span>
        <span className="font-mono text-sm text-text-secondary">
          {formatMoney(Number(item.avg_buy_price))}
        </span>
      </div>

      <div className={CELL.pnl}>
        <span className="sr-only">Profit or loss </span>
        {isLoading ? (
          <span className="block h-3.5 w-16 ml-auto bg-border animate-pulse" />
        ) : pnl !== null ? (
          <span className={`font-mono text-sm font-medium ${tone(pnl.dollars)}`}>
            {formatMoney(pnl.dollars, { signed: true })}
          </span>
        ) : (
          dash
        )}
      </div>

      <div className={CELL.pct}>
        {isLoading ? (
          <span className="block h-3.5 w-12 ml-auto bg-border animate-pulse" />
        ) : pnl !== null ? (
          <span className={`font-mono text-sm font-bold ${tone(pnl.percent)}`}>
            {formatPercent(pnl.percent)}
          </span>
        ) : (
          dash
        )}
      </div>

      <div className={CELL.remove}>
        <Button
          kind="text"
          size="sm"
          muted
          aria-label={`Remove ${item.ticker}`}
          // detail is 0 when a key, not a pointer, pressed the button.
          onClick={(e) => onRemove(item, e.detail === 0)}
        >
          Remove
        </Button>
      </div>
    </motion.li>
  );
}

// ─── "Removed · Undo" message ──────────────────────────────────────────────

const UNDO_MS = 5000;

function UndoToast({
  removed,
  takeFocus,
  onUndo,
  onExpire,
}: {
  removed: { item: WatchlistItem; key: number } | null;
  /** Move focus to Undo when it opens (the removal came from the keyboard). */
  takeFocus: boolean;
  onUndo: () => void;
  /** Called when the message closes on its own; `hadFocus` if focus was in it. */
  onExpire: (hadFocus: boolean) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const [paused, setPaused] = useState(false);
  const key = removed?.key;

  // Each new message starts unpaused. (Focus can leave by the message
  // closing under it, which fires no blur, so a pause could otherwise stick.)
  useEffect(() => {
    setPaused(false);
  }, [key]);

  useEffect(() => {
    if (key !== undefined && takeFocus) undoRef.current?.focus();
  }, [key, takeFocus]);

  // Five seconds, paused while the pointer or keyboard focus is on it.
  useEffect(() => {
    if (key === undefined || paused) return;
    const t = setTimeout(() => {
      onExpire(Boolean(boxRef.current?.contains(document.activeElement)));
    }, UNDO_MS);
    return () => clearTimeout(t);
  }, [key, paused, onExpire]);

  return (
    // The live region is always in the page, so its text is announced when
    // it appears.
    <div
      role="status"
      aria-live="polite"
      className="fixed z-50 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] md:bottom-6 pointer-events-none"
    >
      {removed && (
        <div
          ref={boxRef}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
          }}
          className="on-dark pointer-events-auto flex items-center gap-3 bg-[#1A1A1A] text-white rounded-lg pl-4 pr-3 py-2 shadow-xl sm:min-w-[18rem]"
        >
          <p className="font-body text-sm">
            Removed <span className="font-mono font-bold">{removed.item.ticker}</span>
            <span aria-hidden="true" className="text-white/50"> · </span>
          </p>
          <Button
            ref={undoRef}
            kind="text"
            onClick={onUndo}
            aria-label={`Undo removing ${removed.item.ticker}`}
            className="!text-canary !decoration-canary/50 hover:!decoration-canary"
          >
            Undo
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── News section ──────────────────────────────────────────────────────────

function formatNewsDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const NEWS_VISIBLE = 8;

// One line from sm up: ticker, headline, source and date. On a phone the
// headline drops below the ticker and date, and gets two lines there since
// one line would cut it after a few words.
function NewsRow({ article }: { article: NewsArticle }) {
  return (
    <li className="border-b border-border">
      {/* -mx-2 lets the hover fill reach past the text without moving it
          out of line with the rules. */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        title={article.headline}
        className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[4rem_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 -mx-2 px-2 py-3 transition-colors duration-150 hover:bg-[#F0EDE6] focus-visible:bg-[#F0EDE6]"
      >
        <span className="font-mono text-[11px] font-medium text-gold-ink">
          {article.ticker}
        </span>
        <span className="col-span-2 sm:col-span-1 order-last sm:order-none font-body text-sm text-text-primary line-clamp-2 sm:line-clamp-1">
          {article.headline}
        </span>
        <span className="font-mono text-[11px] text-text-secondary text-right whitespace-nowrap">
          <span className="hidden sm:inline">{article.source} · </span>
          {formatNewsDate(article.datetime)}
        </span>
      </a>
    </li>
  );
}

function NewsList({ articles }: { articles: NewsArticle[] }) {
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const shown = expanded ? articles : articles.slice(0, NEWS_VISIBLE);

  // The button disappears once pressed, so keyboard focus moves to the first
  // headline it revealed instead of falling back to the top of the page.
  useEffect(() => {
    if (expanded) listRef.current?.querySelectorAll("a")[NEWS_VISIBLE]?.focus();
  }, [expanded]);

  return (
    <>
      <ul ref={listRef} className="border-t border-border">
        {shown.map((article) => (
          <NewsRow key={`${article.ticker}-${article.url}`} article={article} />
        ))}
      </ul>
      {shown.length < articles.length && (
        <Button kind="text" onClick={() => setExpanded(true)} className="mt-3">
          Show more
        </Button>
      )}
    </>
  );
}

function NewsSection({ news }: { news: NewsState }) {
  if (news.status === "idle" || news.status === "error") return null;

  return (
    <div className="mt-10">
      <SectionLabel className="text-text-secondary !mb-4">Latest news</SectionLabel>
      {news.status === "loading" ? (
        <div aria-hidden className="border-t border-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 flex items-center border-b border-border">
              <div className="h-1 w-full bg-border animate-pulse" />
            </div>
          ))}
        </div>
      ) : news.articles.length === 0 ? (
        <p className="font-body text-sm text-text-secondary">
          No recent news for your holdings.
        </p>
      ) : (
        <NewsList articles={news.articles} />
      )}
    </div>
  );
}

function insertAt<T>(list: T[], item: T, index: number): T[] {
  const next = [...list];
  next.splice(index < 0 ? next.length : Math.min(index, next.length), 0, item);
  return next;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteData | "loading">>({});
  const [loadingList, setLoadingList] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsState>({ status: "idle" });
  // The last removal, kept for five seconds so it can be undone.
  const [removed, setRemoved] = useState<{ item: WatchlistItem; index: number; key: number } | null>(null);
  const [undoTakesFocus, setUndoTakesFocus] = useState(false);
  const holdingsHeadingRef = useRef<HTMLHeadingElement>(null);
  // After an undo, focus returns to the restored row's Remove action.
  const [refocusId, setRefocusId] = useState<string | null>(null);

  // Fires after the watchlist itself has loaded — news never blocks the page,
  // and a failed fetch simply hides the section.
  const fetchNews = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) {
      setNews({ status: "idle" });
      return;
    }
    setNews({ status: "loading" });
    try {
      const res = await fetch(
        `/api/stock/news?tickers=${encodeURIComponent(tickers.join(","))}`
      );
      if (!res.ok) {
        setNews({ status: "error" });
        return;
      }
      const json = await res.json();
      setNews({
        status: "loaded",
        articles: Array.isArray(json.articles) ? json.articles : [],
      });
    } catch {
      setNews({ status: "error" });
    }
  }, []);

  // Fetch watchlist from Supabase
  const fetchWatchlist = useCallback(async () => {
    const supabase = createClient();

    // Verify auth before querying — surfaces session issues immediately
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user) {
      setListError(reportError("watchlist auth", userError, PLAIN.session));
      setLoadingList(false);
      return;
    }

    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .order("added_at", { ascending: true });

    if (error) {
      setListError(reportError("watchlist fetch", error, PLAIN.load));
      setLoadingList(false);
      return;
    }

    const loaded = data ?? [];
    setItems(loaded);
    setLoadingList(false);

    // Kick off the news fetch without blocking quote loading
    fetchNews(loaded.map((i) => i.ticker));

    // Mark all as loading quotes, then fetch
    if (loaded.length > 0) {
      const loadingMap: Record<string, "loading"> = {};
      loaded.forEach((i) => (loadingMap[i.ticker] = "loading"));
      setQuotes(loadingMap);

      const fetched = await Promise.all(
        loaded.map(async (item) => {
          try {
            const data = await fetchQuote<QuoteData>(item.ticker);
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
  }, [fetchNews]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  async function handleAddStock(shares: number, avgBuyPrice: number): Promise<string | null> {
    if (!selectedStock) return null;
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user) return reportError("watchlist add: auth", userError, PLAIN.session);

      const { error } = await supabase.from("watchlist").insert({
        user_id: user.id,
        ticker: selectedStock.ticker,
        company_name: selectedStock.company_name,
        shares,
        avg_buy_price: avgBuyPrice,
      });
      if (error) return reportError("watchlist add", error, PLAIN.save);
    } catch (err) {
      return reportError("watchlist add", err, PLAIN.network);
    }

    setSelectedStock(null);
    await fetchWatchlist();
    window.dispatchEvent(new Event(WATCHLIST_CHANGED));
    return null;
  }

  // Removing takes the row out at once and deletes it on the server; Undo
  // puts the same row back (same id and date, so it keeps its place).
  async function handleRemove(item: WatchlistItem, viaKeyboard: boolean) {
    const index = items.findIndex((i) => i.id === item.id);
    setListError(null);
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    let failed: unknown = null;
    try {
      const { error } = await createClient().from("watchlist").delete().eq("id", item.id);
      failed = error;
    } catch (err) {
      failed = err;
    }
    if (failed) {
      setItems((prev) => insertAt(prev, item, index));
      setListError(reportError("watchlist remove", failed, `Couldn't remove ${item.ticker}. Try again in a moment.`));
      return;
    }

    setUndoTakesFocus(viaKeyboard);
    setRemoved({ item, index, key: Date.now() });
    if (!viaKeyboard) holdingsHeadingRef.current?.focus({ preventScroll: true });
    window.dispatchEvent(new Event(WATCHLIST_CHANGED));
  }

  async function handleUndo() {
    if (!removed) return;
    const { item, index } = removed;
    setRemoved(null);
    try {
      const { error } = await createClient().from("watchlist").insert({
        id: item.id,
        user_id: item.user_id,
        ticker: item.ticker,
        company_name: item.company_name,
        shares: item.shares,
        avg_buy_price: item.avg_buy_price,
        added_at: item.added_at,
      });
      if (error) throw error;
    } catch (err) {
      setListError(reportError("watchlist undo", err, `Couldn't put ${item.ticker} back. Add it again from the search.`));
      holdingsHeadingRef.current?.focus();
      return;
    }
    setItems((prev) => insertAt(prev, item, index));
    setRefocusId(item.id);
    window.dispatchEvent(new Event(WATCHLIST_CHANGED));
  }

  const handleUndoExpire = useCallback((hadFocus: boolean) => {
    setRemoved(null);
    // Focus was on Undo when the message went away: put it somewhere sensible.
    if (hadFocus) holdingsHeadingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!refocusId) return;
    const button = document.querySelector<HTMLElement>(
      `[data-holding="${refocusId}"] button[aria-label^="Remove"]`
    );
    button?.focus();
    setRefocusId(null);
  }, [refocusId, items]);

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

  const canaries = items.map((item) => {
    const quote = quotes[item.ticker];
    return {
      id: item.id,
      ticker: item.ticker,
      ...resolveHoldingCanary(item, quote === "loading" ? null : quote),
    };
  });

  return (
    <AppPage>
      <Masthead
        label="Your portfolio"
        title="Watchlist"
        aside={
          hasLiveData && items.length > 0 ? (
            <div className="text-left sm:text-right">
              <CountUp
                value={totals.currentValue}
                format={formatMoney}
                className="font-mono text-xl font-bold text-text-primary"
              />
              <p
                className={`font-mono text-sm font-semibold ${
                  totalPnL >= 0 ? "text-positive-ink" : "text-urgent-ink"
                }`}
              >
                <CountUp
                  value={totalPnL}
                  format={(n) => formatMoney(n, { signed: true })}
                />{" "}
                <span className="text-xs font-normal">
                  (<CountUp value={totalPnLPct} format={(n) => formatPercent(n)} />)
                </span>
              </p>
            </div>
          ) : undefined
        }
      >
        {items.length > 0 && (
          <div className="mt-6">
            <CanaryStrip holdings={canaries} />
          </div>
        )}
      </Masthead>

      {/* ── Search ── */}
      <div className="mb-6">
        <StockSearch label="Add a stock" onSelect={setSelectedStock} />

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
        <p role="alert" className="border-t border-border py-4 font-body text-sm text-urgent-ink">
          {listError}
        </p>
      )}

      {/* ── Holdings ── */}
      <h2 ref={holdingsHeadingRef} tabIndex={-1} className="sr-only">
        Holdings
      </h2>
      {!loadingList && items.length > 0 && <ColumnHeaders />}
      <ul aria-label="Holdings" className="border-t border-border">
        {loadingList ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          <AnimatePresence initial={true}>
            {items.map((item, index) => (
              <WatchlistRow
                key={item.id}
                item={item}
                quote={quotes[item.ticker] ?? null}
                onRemove={handleRemove}
                index={index}
              />
            ))}
          </AnimatePresence>
        )}
      </ul>
      {!loadingList && items.length === 0 && <EmptyState />}

      <UndoToast
        removed={removed}
        takeFocus={undoTakesFocus}
        onUndo={handleUndo}
        onExpire={handleUndoExpire}
      />

      {/* ── Latest news ── */}
      {items.length > 0 && <NewsSection news={news} />}

      {/* ── Market movers ── */}
      <MarketMovers className="mt-10" />
    </AppPage>
  );
}
