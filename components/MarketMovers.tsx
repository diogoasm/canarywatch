"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatMoney, formatPercent } from "@/lib/format";
import {
  LIST_SIZE,
  type Mover,
  type MoverList,
  type MoverListKey,
  type MoversData,
} from "@/lib/movers";

const TABS: { key: MoverListKey; label: string }[] = [
  { key: "gainers", label: "Gainers" },
  { key: "losers", label: "Losers" },
  { key: "mostActive", label: "Most active" },
];

// The header and each row are separate grids, so the tracks are fixed widths
// to keep the columns aligned.
const COLUMNS =
  "grid grid-cols-[1fr_6rem_6rem] sm:grid-cols-[4.5rem_minmax(0,1fr)_5.5rem_5rem_5.5rem] gap-x-3";

// ─── Formatting ────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short" });
}

// The route decides what's live; times here are in the reader's own zone.
function marketLabel({ live, asOf, closeAt }: MoverList): string {
  if (live && asOf) return `Live · updated ${formatTime(asOf)}`;
  if (!closeAt) return "Last session";

  const label = `Last session · ${formatWeekday(closeAt)}, ${formatTime(closeAt)} close`;
  // Saved during the session, so these aren't closing prices.
  return asOf && asOf < closeAt
    ? `${label} · prices from ${formatTime(asOf)}`
    : label;
}

function toneClass(value: number): string {
  if (value > 0) return "text-positive-ink";
  if (value < 0) return "text-urgent-ink";
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
        className={`${COLUMNS} h-11 items-center -mx-2 px-2 transition-colors duration-150 hover:bg-[#F0EDE6]`}
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
          {formatMoney(mover.price)}
        </span>
        <span
          className={`hidden sm:block font-mono text-[13px] tabular-nums text-right ${tone}`}
        >
          {formatMoney(mover.change, { signed: true })}
        </span>
        <span
          className={`font-mono text-[13px] tabular-nums text-right ${tone}`}
        >
          {formatPercent(mover.changesPercentage)}
        </span>
      </a>
    </motion.li>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────

export default function MarketMovers({
  className,
  innerClassName,
  heading,
}: {
  className?: string;
  innerClassName?: string;
  /** Replaces the "Market movers" heading. */
  heading?: React.ReactNode;
}) {
  // undefined = still loading, null = fetch failed
  const [data, setData] = useState<MoversData | null | undefined>(undefined);
  const [tab, setTab] = useState<MoverListKey>("gainers");

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
  const tabs = data ? TABS.filter((t) => data[t.key].movers.length > 0) : TABS;
  if (data === null || tabs.length === 0) return null;

  const activeKey = tabs.find((t) => t.key === tab)?.key ?? tabs[0].key;

  return (
    <section className={className}>
      <div className={innerClassName}>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 mb-5">
          {heading ?? (
            <h2 className="font-display text-xl font-semibold text-text-primary">
              Market movers
            </h2>
          )}
          <div role="group" aria-label="Market movers list" className="flex gap-5">
            {tabs.map((t) => {
              const active = t.key === activeKey;
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTab(t.key)}
                  className={`tap font-body text-[13px] py-1 border-b-2 transition-colors duration-150 ${
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
            {data[activeKey].movers.map((mover, index) => (
              <MoverRow key={mover.symbol} mover={mover} index={index} />
            ))}
          </ul>
        ) : (
          <div aria-hidden>
            {Array.from({ length: LIST_SIZE }, (_, i) => (
              <div key={i} className="h-[45px] flex items-center">
                <div className="h-1 w-full bg-border animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Too long for one line on a phone, so it breaks at the separator. The
            line is kept but hidden while loading so nothing jumps on arrival. */}
        <p
          className={`mt-3 font-mono text-[11px] text-text-secondary ${
            data ? "" : "invisible"
          }`}
        >
          <span className="block sm:inline">
            {data ? marketLabel(data[activeKey]) : " "}
          </span>
          <span className="hidden sm:inline"> · </span>
          Data via Financial Modeling Prep
        </p>
      </div>
    </section>
  );
}
