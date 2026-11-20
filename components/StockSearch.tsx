"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { StockSearchResult } from "@/types";

// An ARIA 1.2 combobox: the input keeps focus, arrow keys move a highlight
// through the results (announced via aria-activedescendant), Enter picks,
// Escape closes (and clears on a second press). Result counts and "No
// matches" are announced through a polite live region.

type Status = "idle" | "searching" | "done" | "error";

export default function StockSearch({
  onSelect,
  label = "Search stocks",
}: {
  onSelect: (result: StockSearchResult) => void;
  /** Visible label above the field. */
  label?: string;
}) {
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-option-${i}`;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Only the latest search may write results, however the replies arrive.
  const latest = useRef(0);

  // Close on a click or tap outside.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      latest.current++;
      setResults([]);
      setStatus("idle");
      setOpen(false);
      return;
    }
    const run = ++latest.current;
    const timer = setTimeout(async () => {
      setStatus("searching");
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (run !== latest.current) return;
        if (!res.ok || data.error) {
          console.error("[search]", res.status, data.error);
          setResults([]);
          setStatus("error");
        } else {
          setResults(data.results ?? []);
          setStatus("done");
        }
      } catch (err) {
        if (run !== latest.current) return;
        console.error("[search]", err);
        setResults([]);
        setStatus("error");
      }
      setActive(-1);
      setOpen(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Keep the highlighted option in view when arrowing through a long list.
  useEffect(() => {
    if (active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId only depends on id, which never changes.
  }, [active]);

  function pick(result: StockSearchResult) {
    onSelect(result);
    latest.current++;
    setQuery("");
    setResults([]);
    setStatus("idle");
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const count = results.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open && status !== "idle") setOpen(true);
        if (count) setActive((i) => (i + 1) % count);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open && status !== "idle") setOpen(true);
        if (count) setActive((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case "Home":
        if (open && count) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open && count) {
          e.preventDefault();
          setActive(count - 1);
        }
        break;
      case "Enter":
        if (open && active >= 0 && results[active]) {
          e.preventDefault();
          pick(results[active]);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (query) {
          e.preventDefault();
          setQuery("");
        }
        break;
    }
  }

  const showPopup = open && (status === "done" || status === "error");
  const announcement =
    status === "searching"
      ? "Searching…"
      : status === "error"
        ? "Search isn't working right now."
        : status === "done"
          ? results.length === 0
            ? "No matches"
            : `${results.length} result${results.length === 1 ? "" : "s"}. Use the up and down arrows to choose.`
          : "";

  return (
    <div ref={wrapperRef} className="relative">
      <label
        htmlFor={inputId}
        className="block font-body text-sm text-text-secondary mb-1"
      >
        {label}
      </label>
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute left-0 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
        >
          {status === "searching" ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showPopup}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPopup && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Ticker or company name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => status === "done" && setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full pl-7 pr-2 py-3 bg-transparent border-0 border-b border-field rounded-none font-body text-base text-text-primary placeholder:text-text-secondary hover:border-text-primary focus:border-text-primary transition-colors"
        />
      </div>

      {/* Polite live region: result counts, "No matches", errors. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* The listbox stays in the DOM so aria-controls always points at it. */}
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={`${label} results`}
        hidden={!showPopup || results.length === 0}
        className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-white border border-border rounded-lg shadow-card-hover z-30"
      >
        {results.map((result, i) => (
          <li
            key={result.ticker}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            // Keep focus in the input when a result is clicked or tapped.
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => pick(result)}
            onPointerMove={() => active !== i && setActive(i)}
            className={`flex items-center gap-3 px-4 min-h-[48px] py-2 cursor-pointer border-b border-border last:border-0 ${
              i === active ? "bg-[#F0EDE6]" : ""
            }`}
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
          </li>
        ))}
      </ul>

      {showPopup && results.length === 0 && (
        <p
          aria-hidden="true"
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-card-hover z-30 px-4 py-3 font-body text-sm text-text-secondary"
        >
          {status === "error"
            ? "Search isn't working right now. Try again in a moment."
            : `No matches for “${query.trim()}”.`}
        </p>
      )}
    </div>
  );
}
