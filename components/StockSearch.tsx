"use client";

import { useEffect, useRef, useState } from "react";
import type { StockSearchResult } from "@/types";

export default function StockSearch({
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
