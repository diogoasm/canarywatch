"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Navbar from "@/components/Navbar";
import CanaryIcon, { CanaryLogoIcon } from "@/components/CanaryIcon";

const INTRO_KEY = "canary-intro-played";

// ─── Flying canary intro overlay ────────────────────────────────────────────
// A self-contained fixed overlay that flies the canary across the screen once,
// then unmounts. It sits ON TOP of the page (which renders normally beneath it)
// and never affects layout — pointer-events are disabled so it can't block UI.

function FlyingCanaryOverlay({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] pointer-events-none flex items-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="absolute top-1/2"
        initial={{ x: "-15vw", opacity: 0, rotate: -8 }}
        animate={{
          x: ["-15vw", "55vw", "115vw"],
          opacity: [0, 1, 1, 0],
          rotate: [-8, 6, -4],
          y: [0, -24, 0],
        }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
        onAnimationComplete={onDone}
      >
        <CanaryLogoIcon size={88} />
      </motion.div>
    </motion.div>
  );
}

// ─── Hero mock watchlist ───────────────────────────────────────────────────
// Live prices from /api/stock/quote (public, Finnhub-backed). Falls back to
// static placeholder prices if the fetch fails.

const MOCK_STOCKS = [
  {
    ticker: "SPY",
    name: "S&P 500 ETF",
    fallbackPrice: "594.20",
    fallbackChange: 0.42,
    status: "green" as const,
  },
  {
    ticker: "GLD",
    name: "Gold ETF",
    fallbackPrice: "248.10",
    fallbackChange: 0.18,
    status: "grey" as const,
  },
  {
    ticker: "NVDA",
    name: "Nvidia Corp",
    fallbackPrice: "878.35",
    fallbackChange: 2.41,
    status: "yellow" as const,
  },
];

interface MockQuote {
  price: string;
  change: number;
}

function MockWatchlist() {
  // undefined = still loading, null = fetch failed (use fallback)
  const [quotes, setQuotes] = useState<
    Record<string, MockQuote | null | undefined>
  >({});

  useEffect(() => {
    let cancelled = false;
    MOCK_STOCKS.forEach(async (stock) => {
      try {
        const res = await fetch(`/api/stock/quote?ticker=${stock.ticker}`);
        const data = await res.json();
        if (cancelled) return;
        const ok = res.ok && typeof data.price === "number";
        setQuotes((prev) => ({
          ...prev,
          [stock.ticker]: ok
            ? {
                price: data.price.toFixed(2),
                change:
                  typeof data.change_percent === "number"
                    ? data.change_percent
                    : 0,
              }
            : null,
        }));
      } catch {
        if (!cancelled) {
          setQuotes((prev) => ({ ...prev, [stock.ticker]: null }));
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card w-full max-w-xs mx-auto overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
        <span className="font-playfair text-sm font-semibold text-text-primary">
          My Watchlist
        </span>
        <span className="font-body text-[11px] text-text-secondary">
          3 stocks
        </span>
      </div>
      <div className="divide-y divide-border">
        {MOCK_STOCKS.map((stock) => {
          const quote = quotes[stock.ticker];
          const loading = quote === undefined;
          const price = quote?.price ?? stock.fallbackPrice;
          const change = quote?.change ?? stock.fallbackChange;
          const positive = change >= 0;
          return (
            <div
              key={stock.ticker}
              className="px-3.5 py-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <CanaryIcon status={stock.status} size={15} />
                <div>
                  <p className="font-body text-xs font-semibold text-text-primary">
                    {stock.ticker}
                  </p>
                  <p className="font-body text-[11px] text-text-secondary">
                    {stock.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {loading ? (
                  <>
                    <p className="font-mono text-xs text-text-secondary/50">
                      ···
                    </p>
                    <p className="font-mono text-[11px] text-text-secondary/50">
                      ···
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-mono text-xs font-medium text-text-primary">
                      ${price}
                    </p>
                    <p
                      className={`font-mono text-[11px] font-medium ${
                        positive ? "text-positive" : "text-urgent"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {change.toFixed(2)}%
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Feature cards ─────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card card-hover p-6 flex flex-col gap-4">
      <div className="w-10 h-10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold text-text-primary mb-2">
          {title}
        </h3>
        <p className="font-body text-sm text-text-secondary leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const reduce = useReducedMotion();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    console.log("page is interactive");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasPlayed = sessionStorage.getItem(INTRO_KEY) === "1";
    if (!hasPlayed && !reduce) {
      setShowIntro(true);
    }
    sessionStorage.setItem(INTRO_KEY, "1");
  }, [reduce]);

  function handleIntroDone() {
    setShowIntro(false);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Flying canary intro — a fixed overlay above the page; the layout below
          (navbar, hero, content) always renders normally and is unaffected. */}
      <AnimatePresence>
        {showIntro && <FlyingCanaryOverlay onDone={handleIntroDone} />}
      </AnimatePresence>

      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          {/* Copy */}
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight tracking-tight mb-5">
                Know before
                <br />
                it moves.
              </h1>
              <p className="font-body text-base text-text-secondary leading-relaxed max-w-md">
                Canary watches your portfolio and warns you before earnings,
                crashes, and key events — so you never miss what matters.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                href="/signup"
                className="btn-primary font-playfair text-sm px-6 py-2.5"
              >
                Get Started Free
              </Link>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="btn-outline font-playfair text-sm px-6 py-2.5"
              >
                See how it works
              </button>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <CanaryIcon status="red" size={16} />
                <span className="font-body text-xs text-text-secondary">
                  Earnings alerts
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CanaryIcon status="yellow" size={16} />
                <span className="font-body text-xs text-text-secondary">
                  Risk flags
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CanaryIcon status="green" size={16} />
                <span className="font-body text-xs text-text-secondary">
                  Positive signals
                </span>
              </div>
            </div>
          </div>

          {/* Mock UI */}
          <div className="lg:flex lg:justify-end">
            <div className="w-full max-w-xs mx-auto lg:mx-0">
              <MockWatchlist />
              {/* Briefing preview card */}
              <div className="card mt-3 p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#FFF8E1] flex items-center justify-center shrink-0">
                    <CanaryLogoIcon size={15} />
                  </div>
                  <div>
                    <p className="font-playfair text-xs font-semibold text-text-primary mb-1">
                      Canary Briefing
                    </p>
                    <p className="font-body text-[11px] text-text-secondary leading-relaxed">
                      <span className="text-canary-dark font-medium">NVDA</span>{" "}
                      earnings approaching — analyst consensus is Strong Buy
                      with $1,200 avg target. Up 8.3% from your entry.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section
        id="features"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
      >
        <div className="text-center mb-14">
          <div>
            <div className="relative inline-block">
              <span
                aria-hidden
                className="pointer-events-none absolute z-0"
                style={{ bottom: -20, right: -30, opacity: 0.07 }}
              >
                <CanaryLogoIcon size={120} color="#2D9E6B" />
              </span>
              <h2 className="section-heading mb-4 relative z-[1]">
                Everything you need to stay ahead.
              </h2>
            </div>
          </div>
          <div>
            <div className="relative inline-block">
              <span
                aria-hidden
                className="pointer-events-none absolute z-0"
                style={{ bottom: -20, left: -30, opacity: 0.07 }}
              >
                <CanaryLogoIcon size={120} color="#E03B3B" />
              </span>
              <p className="section-subheading max-w-xl mx-auto relative z-[1]">
                Built for retail traders who want intelligence without the noise.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={
              <CanaryIcon status="red" size={32} />
            }
            title="Canary Warnings"
            description="Color-coded canary icons flag earnings dates, sector risks and key events automatically every time you open your watchlist."
          />
          <FeatureCard
            icon={
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  width="32"
                  height="32"
                  rx="8"
                  fill="#F5C842"
                  fillOpacity="0.12"
                />
                <path
                  d="M9 22l4-8 4 4 3-6 3 4"
                  stroke="#D4A800"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="23" cy="10" r="2.5" fill="#F5C842" />
              </svg>
            }
            title="AI Briefings"
            description="Get a personalized portfolio briefing powered by real data and your exact positions — not generic market commentary."
          />
          <FeatureCard
            icon={
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  width="32"
                  height="32"
                  rx="8"
                  fill="#2D9E6B"
                  fillOpacity="0.10"
                />
                <path
                  d="M8 16h3l3-6 4 12 3-8 2 2h3"
                  stroke="#2D9E6B"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            title="Your Numbers, Not Guesses"
            description="Canary calculates your real P&L, percentage gains and risk based on what you actually paid and how many shares you hold."
          />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <CanaryLogoIcon size={22} />
              <span className="font-display text-base font-semibold text-text-primary">
                Canary
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Terms
              </Link>
            </div>

            {/* Tagline */}
            <p className="font-body text-sm text-text-secondary italic">
              Built for retail traders. Not Wall Street.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
