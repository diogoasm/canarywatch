"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Mover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

interface MoversData {
  gainers: Mover[];
  losers: Mover[];
  mostActive: Mover[];
  updatedAt: string;
}

type TabKey = "gainers" | "losers" | "mostActive";

const TABS: { key: TabKey; label: string }[] = [
  { key: "gainers", label: "Gainers" },
  { key: "losers", label: "Losers" },
  { key: "mostActive", label: "Most active" },
];

const ROW_COUNT = 8;

// The header and each row are separate grids, so the tracks are fixed widths
// to keep the columns aligned.
const COLUMNS =
  "grid grid-cols-[1fr_6rem_6rem] sm:grid-cols-[4.5rem_minmax(0,1fr)_5.5rem_5rem_5.5rem] gap-x-3";

// ─── Formatting ────────────────────────────────────────────────────────────

const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

function formatPrice(price: number): string {
  return `$${price.toLocaleString("en-US", TWO_DECIMALS)}`;
}

function formatSigned(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toLocaleString("en-US", TWO_DECIMALS)}${suffix}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function toneClass(value: number): string {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-urgent";
  return "text-text-secondary";
}

// ─── Row ───────────────────────────────────────────────────────────────────

function MoverRow({ mover, index }: { mover: Mover; index: number }) {
  const reduce = useReducedMotion();
  const tone = toneClass(mover.change);

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: index * 0.02, ease: "easeOut" }}
      className="border-b border-border"
    >
      {/* -mx-2 lets the hover fill breathe past the text without moving it
          out of line with the heading and the rules. */}
      <a
        href={`https://finance.yahoo.com/quote/${mover.symbol}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${COLUMNS} h-10 items-center -mx-2 px-2 transition-colors duration-150 hover:bg-[#F0EDE6]`}
      >
        <span className="font-mono text-[13px] font-bold text-text-primary">
          {mover.symbol}
        </span>
        <span
          title={mover.name}
          className="hidden sm:block font-body text-[13px] text-text-secondary truncate"
        >
          {mover.name}
        </span>
        <span className="font-mono text-[13px] tabular-nums text-right text-text-primary">
          {formatPrice(mover.price)}
        </span>
        <span
          className={`hidden sm:block font-mono text-[13px] tabular-nums text-right ${tone}`}
        >
          {formatSigned(mover.change)}
        </span>
        <span
          className={`font-mono text-[13px] tabular-nums text-right ${tone}`}
        >
          {formatSigned(mover.changesPercentage, "%")}
        </span>
      </a>
    </motion.li>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────

export default function MarketMovers({ className }: { className?: string }) {
  // undefined = still loading, null = fetch failed
  const [data, setData] = useState<MoversData | null | undefined>(undefined);
  const [tab, setTab] = useState<TabKey>("gainers");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/market/movers");
        const json: MoversData | null = res.ok ? await res.json() : null;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // A list that failed comes back empty, so its tab drops out.
  const tabs = data ? TABS.filter((t) => data[t.key].length > 0) : TABS;
  if (data === null || tabs.length === 0) return null;

  const activeKey = tabs.find((t) => t.key === tab)?.key ?? tabs[0].key;

  return (
    <section className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-4">
        <h2 className="font-playfair text-xl font-semibold text-text-primary">
          Market movers
        </h2>
        <div role="group" aria-label="Market movers list" className="flex gap-5">
          {tabs.map((t) => {
            const active = t.key === activeKey;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(t.key)}
                className={`font-body text-[13px] py-1 border-b-2 transition-colors duration-150 ${
                  active
                    ? "text-text-primary border-canary"
                    : "text-text-secondary border-transparent hover:text-text-primary"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        aria-hidden
        className={`${COLUMNS} pb-2 border-b border-border font-mono text-[10px] uppercase tracking-wider text-text-secondary`}
      >
        <span>Symbol</span>
        <span className="hidden sm:block">Name</span>
        <span className="text-right">Price</span>
        <span className="hidden sm:block text-right">Change</span>
        <span className="text-right">Change %</span>
      </div>

      {data ? (
        // Keyed by tab so switching remounts the rows and replays the fade.
        <ul key={activeKey}>
          {data[activeKey].map((mover, index) => (
            <MoverRow key={mover.symbol} mover={mover} index={index} />
          ))}
        </ul>
      ) : (
        <div aria-hidden>
          {Array.from({ length: ROW_COUNT }, (_, i) => (
            <div key={i} className="h-[41px] flex items-center">
              <div className="h-1 w-full bg-border animate-pulse" />
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 font-mono text-[11px] text-text-secondary">
        Data via Financial Modeling Prep
        {data && ` · updated ${formatTime(data.updatedAt)}`}
      </p>
    </section>
  );
}
