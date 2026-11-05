"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import CanaryIcon, { CanaryLogoIcon } from "@/components/CanaryIcon";
import CanaryStrip from "@/components/CanaryStrip";
import { fetchQuote } from "@/lib/quotes";
import type { CanaryStatus, Profile, WatchlistItem } from "@/types";
import { daysUntil, resolveHoldingCanary } from "@/lib/utils";

// ─── Local types ───────────────────────────────────────────────────────────

interface PortfolioSnapshot {
  total_value: number;
  total_pnl_dollars: number;
  total_pnl_percent: number;
  best_performer: { ticker: string; pnl_percent: number } | null;
  worst_performer: { ticker: string; pnl_percent: number } | null;
}

interface KeyDate {
  ticker: string;
  company_name: string;
  earnings_date: string | null;
  days_until: number | null;
  confirmed?: boolean;
}

interface WarningItem {
  message: string;
  severity: "red" | "yellow" | "green";
}

type WarningEntry = WarningItem | string;

interface BriefingContent {
  portfolio_snapshot: PortfolioSnapshot;
  key_dates: KeyDate[];
  canary_warnings: WarningEntry[];
  market_context: string;
  outlook: string[];
  disclaimer: string;
}

interface Briefing {
  id: string;
  content: BriefingContent;
  generated_at: string;
  type: string;
}

interface QuoteData {
  price?: number;
  next_earnings_date?: string | null;
}

interface FreshEarnings {
  ticker: string;
  date: string | null;
  confirmed: boolean;
}

const MONTHLY_LIMIT = 2;
const AUTO_REFRESH_HOURS = 20;
const AUTO_REFRESH_LOCK = "canary-briefing-auto-refresh";

const LOADING_MESSAGES = [
  "Fetching your portfolio data...",
  "Analysing your positions...",
  "Checking key dates...",
  "Writing your briefing...",
];

// ─── Helpers ───────────────────────────────────────────────────────────────

const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

function fmtSigned(value: number, prefix = "", suffix = ""): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${prefix}${Math.abs(value).toLocaleString("en-US", TWO_DECIMALS)}${suffix}`;
}

function fmtMastheadDate(date: Date): string {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const dayMonth = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
  return `${weekday}, ${dayMonth}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCalendarDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function fmtCountdown(days: number): string {
  if (days <= 0) return "today";
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

function toneClass(value: number): string {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-urgent";
  return "text-text-primary";
}

function creditsRemaining(profile: Profile): number | null {
  if (profile.plan === "premium") return null; // unlimited
  return Math.max(0, MONTHLY_LIMIT - profile.briefings_used);
}

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function isRefreshDue(briefing: Briefing | null): boolean {
  return !briefing || hoursSince(briefing.generated_at) > AUTO_REFRESH_HOURS;
}

async function fetchLatestBriefing(userId: string): Promise<Briefing | null> {
  const { data } = await createClient()
    .from("briefings")
    .select("*")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as unknown as Briefing | null;
}

// ─── Empty / generate state ────────────────────────────────────────────────

function GeneratePrompt({
  profile,
  onGenerate,
}: {
  profile: Profile;
  onGenerate: () => void;
}) {
  const remaining = creditsRemaining(profile);
  const canGenerate = profile.plan === "premium" || (remaining ?? 0) > 0;

  return (
    <div className="border-t border-border py-12 max-w-md">
      <h2 className="font-display text-xl font-bold text-text-primary mb-2">
        Ready to analyse your portfolio?
      </h2>
      <p className="font-body text-sm text-text-secondary leading-relaxed mb-6">
        Canary will review all your holdings and flag what needs your attention.
      </p>

      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="bg-canary text-[#1A1A1A] font-playfair text-sm font-bold py-3 px-6 rounded-lg hover:bg-canary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Generate My Briefing
      </button>

      {profile.plan === "free" && canGenerate && (
        <p className="font-mono text-xs text-text-secondary mt-4">
          Uses 1 of your {MONTHLY_LIMIT} monthly briefings
        </p>
      )}

      {!canGenerate && (
        <p className="font-body text-xs text-urgent mt-4">
          No briefings remaining.{" "}
          <a href="/settings" className="underline">
            Upgrade to Premium
          </a>{" "}
          for unlimited access.
        </p>
      )}
    </div>
  );
}

// ─── Generating / loading state ────────────────────────────────────────────

function GeneratingState() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-center py-24 px-4 border-t border-border">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="animate-pulse">
          <CanaryLogoIcon size={52} />
        </div>
        <div>
          <p className="font-body text-sm text-text-secondary transition-all duration-500">
            {LOADING_MESSAGES[msgIndex]}
          </p>
        </div>
        <div className="flex gap-1.5">
          {LOADING_MESSAGES.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                i === msgIndex ? "bg-canary" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Briefing sections ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs font-normal uppercase tracking-widest text-text-secondary mb-6">
      {children}
    </h2>
  );
}

function BriefingSection({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true });
  const [belowFold, setBelowFold] = useState(false);

  // Sections start visible, and only ones that begin off screen are hidden, so
  // nothing on the first screen ever waits on an animation.
  useLayoutEffect(() => {
    const top = ref.current?.getBoundingClientRect().top ?? 0;
    setBelowFold(!reduce && top >= window.innerHeight);
  }, [reduce]);

  const hidden = belowFold && !inView;

  return (
    <motion.section
      ref={ref}
      initial={false}
      animate={hidden ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
      transition={{ duration: hidden ? 0 : 0.4, ease: "easeOut" }}
      className="border-t border-border py-10 sm:py-12"
    >
      {label && <SectionLabel>{label}</SectionLabel>}
      {children}
    </motion.section>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "text-text-primary",
  className,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: string;
  className: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-2">
        {label}
      </p>
      <p
        className={`font-mono text-lg sm:text-xl xl:text-2xl tabular-nums [overflow-wrap:anywhere] ${tone}`}
      >
        {value}
      </p>
      {note && (
        <p className={`font-mono text-xs tabular-nums mt-1 ${tone}`}>{note}</p>
      )}
    </div>
  );
}

function Snapshot({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const { best_performer: best, worst_performer: worst } = snapshot;
  const pnlTone = toneClass(snapshot.total_pnl_dollars);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Total value"
        value={`$${snapshot.total_value.toLocaleString("en-US", TWO_DECIMALS)}`}
        className="pr-4"
      />
      <Stat
        label="Total P&L"
        value={fmtSigned(snapshot.total_pnl_dollars, "$")}
        note={fmtSigned(snapshot.total_pnl_percent, "", "%")}
        tone={pnlTone}
        className="pl-4 border-l border-border"
      />
      <Stat
        label="Best performer"
        value={best ? fmtSigned(best.pnl_percent, "", "%") : "—"}
        note={best?.ticker}
        tone={best ? toneClass(best.pnl_percent) : undefined}
        className="pr-4 mt-8 lg:mt-0 lg:pl-4 lg:border-l lg:border-border"
      />
      <Stat
        label="Worst performer"
        value={worst ? fmtSigned(worst.pnl_percent, "", "%") : "—"}
        note={worst?.ticker}
        tone={worst ? toneClass(worst.pnl_percent) : undefined}
        className="pl-4 mt-8 lg:mt-0 border-l border-border"
      />
    </div>
  );
}

function ComingUp({ dates }: { dates: KeyDate[] }) {
  if (dates.length === 0) {
    return (
      <p className="font-body text-sm text-text-secondary">
        No earnings dates coming up.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {dates.map((d) => {
        const days = daysUntil(d.earnings_date!);
        return (
          <li
            key={d.ticker}
            className={`grid grid-cols-[3.5rem_3.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-3 ${
              days <= 7 ? "text-urgent" : "text-text-primary"
            }`}
          >
            <span className="font-mono text-sm tabular-nums">
              {fmtCalendarDate(d.earnings_date!)}
            </span>
            <span className="font-mono text-sm font-bold">{d.ticker}</span>
            <span className="font-body text-sm">
              Earnings
              {d.confirmed === false && (
                <span className="block sm:inline text-text-secondary">
                  <span className="hidden sm:inline"> · </span>
                  estimated
                </span>
              )}
            </span>
            <span className="font-mono text-sm tabular-nums text-right">
              {fmtCountdown(days)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Warnings({ warnings }: { warnings: WarningEntry[] }) {
  // Normalize: handle both legacy string[] and new {message, severity}[] formats
  const normalized: WarningItem[] = warnings.map((w) =>
    typeof w === "string"
      ? { message: w, severity: "red" as const }
      : (w as WarningItem)
  );

  if (normalized.length === 0) {
    return (
      <p className="font-body text-sm text-text-secondary">
        Nothing needs your attention today.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {normalized.map((w, i) => (
        <li key={i} className="flex items-start gap-3 py-3">
          <CanaryIcon status={w.severity} size={18} className="shrink-0 mt-0.5" />
          <p className="min-w-0 font-body text-sm text-text-primary leading-relaxed">
            {w.message}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Outlook({ outlook }: { outlook: string[] }) {
  if (outlook.length === 0) {
    return (
      <p className="font-body text-sm text-text-secondary">
        No outlook data available.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {outlook.map((line, i) => {
        const colonIdx = line.indexOf(":");
        const ticker = colonIdx > 0 ? line.slice(0, colonIdx).trim() : null;
        const note = colonIdx > 0 ? line.slice(colonIdx + 1).trim() : line;
        return (
          <li
            key={i}
            className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-3 first:pt-0"
          >
            <span className="font-mono text-sm font-bold text-text-primary [overflow-wrap:anywhere]">
              {ticker}
            </span>
            <p className="font-body text-sm text-text-primary leading-relaxed">
              {note}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Full briefing display ─────────────────────────────────────────────────

function BriefingDisplay({
  briefing,
  holdings,
  upcoming,
  canRegenerate,
  onRegenerate,
}: {
  briefing: Briefing;
  holdings: { id: string; ticker: string; status: CanaryStatus }[];
  upcoming: KeyDate[];
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  const c = briefing.content;

  const ageHours = hoursSince(briefing.generated_at);
  const isStale = ageHours >= 24;
  const ageDays = Math.floor(ageHours / 24);

  return (
    <>
      {/* Staleness warning */}
      {isStale && (
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-6 gap-y-2 border-t border-border py-4">
          <p className="font-body text-sm text-text-primary flex-1 leading-relaxed">
            This briefing is{" "}
            <span className="font-mono tabular-nums">{ageDays}</span> day
            {ageDays === 1 ? "" : "s"} old. Stock prices and key dates may have
            changed. Regenerate for current data.
          </p>
          {canRegenerate ? (
            <button
              onClick={onRegenerate}
              className="shrink-0 self-start sm:self-auto font-body text-sm text-text-primary underline underline-offset-2 hover:text-canary-dark transition-colors"
            >
              Regenerate now
            </button>
          ) : (
            <a
              href="/pricing"
              className="shrink-0 self-start sm:self-auto font-body text-sm text-text-primary underline underline-offset-2 hover:text-canary-dark transition-colors"
            >
              Upgrade to Premium to regenerate
            </a>
          )}
        </div>
      )}

      {holdings.length > 0 && (
        <BriefingSection label="Your portfolio">
          <CanaryStrip holdings={holdings} />
        </BriefingSection>
      )}

      <BriefingSection label="Snapshot">
        <Snapshot snapshot={c.portfolio_snapshot} />
      </BriefingSection>

      <BriefingSection label="Coming up">
        <ComingUp dates={upcoming} />
      </BriefingSection>

      <BriefingSection label="Warnings">
        <Warnings warnings={c.canary_warnings} />
      </BriefingSection>

      <BriefingSection>
        <div className="grid lg:grid-cols-2 gap-x-12 gap-y-10">
          <div className="min-w-0">
            <SectionLabel>Market context</SectionLabel>
            <p className="font-body text-sm sm:text-base text-text-primary leading-relaxed">
              {c.market_context}
            </p>
          </div>
          <div className="min-w-0">
            <SectionLabel>Outlook</SectionLabel>
            <Outlook outlook={c.outlook} />
          </div>
        </div>
      </BriefingSection>

      <BriefingSection>
        <p className="font-body text-xs text-text-secondary leading-relaxed">
          {c.disclaimer ||
            "This briefing is AI-generated for informational purposes only. Not financial advice. Always do your own research before making investment decisions."}
        </p>
      </BriefingSection>
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdvisorPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [holdings, setHoldings] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [freshDates, setFreshDates] = useState<Record<string, FreshEarnings>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const refetchProfile = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data as Profile);
  }, []);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setGenerating(true);

    try {
      const res = await fetch("/api/briefing/generate", { method: "POST" });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setGenerating(false);
        return;
      }

      setBriefing(json.briefing as Briefing);
      await refetchProfile();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  }, [refetchProfile]);

  // The route's 2-minute check can't stop two tabs at once: the briefing only
  // exists once Claude has finished, so both would find nothing and both would
  // call it. The lock makes a second tab wait, then read what the first made.
  const autoRefresh = useCallback(
    async (userId: string) => {
      const refresh = async () => {
        const latest = await fetchLatestBriefing(userId);
        if (isRefreshDue(latest)) {
          await handleGenerate();
        } else {
          setBriefing(latest);
          setGenerating(false);
        }
      };

      if ("locks" in navigator) {
        await navigator.locks.request(AUTO_REFRESH_LOCK, refresh);
      } else {
        await refresh();
      }
    },
    [handleGenerate]
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function load() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [profileResult, latest, watchlistResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        fetchLatestBriefing(user.id),
        supabase
          .from("watchlist")
          .select("*")
          .order("added_at", { ascending: true }),
      ]);

      const loadedProfile = profileResult.data as Profile | null;
      const loadedHoldings = (watchlistResult.data ?? []) as WatchlistItem[];

      if (loadedProfile) setProfile(loadedProfile);
      if (latest) setBriefing(latest);
      setHoldings(loadedHoldings);

      // With nothing to analyse the route would only return an error, on every
      // page load.
      const shouldRefresh =
        loadedProfile?.plan === "premium" &&
        loadedHoldings.length > 0 &&
        isRefreshDue(latest);

      if (shouldRefresh) setGenerating(true);
      setLoading(false);
      if (shouldRefresh) await autoRefresh(user.id);
    }

    load();
  }, [autoRefresh]);

  // Live quotes for the canary strip, so it shows today's status rather than
  // whatever was true when the briefing was written.
  useEffect(() => {
    if (holdings.length === 0) return;
    let cancelled = false;

    Promise.all(
      holdings.map(async ({ ticker }) => {
        try {
          return [ticker, await fetchQuote<QuoteData>(ticker)] as const;
        } catch {
          return [ticker, {} as QuoteData] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) setQuotes(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [holdings]);

  // A saved briefing outlives its dates. Anything that has passed is fetched
  // fresh, and stays hidden until then.
  useEffect(() => {
    if (!briefing) return;

    const passed = briefing.content.key_dates
      .filter((d) => d.earnings_date && daysUntil(d.earnings_date) < 0)
      .map((d) => d.ticker);
    if (passed.length === 0) return;

    let cancelled = false;

    fetch(`/api/stock/earnings?tickers=${encodeURIComponent(passed.join(","))}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { earnings: FreshEarnings[] } | null) => {
        if (cancelled || !json) return;
        setFreshDates(
          Object.fromEntries(json.earnings.map((e) => [e.ticker, e]))
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [briefing]);

  const canRegenerate =
    profile !== null &&
    (profile.plan === "premium" || creditsRemaining(profile)! > 0);

  const canaries = holdings.map((item) => ({
    id: item.id,
    ticker: item.ticker,
    status: resolveHoldingCanary(item, quotes[item.ticker]).status,
  }));

  const upcoming = (briefing?.content.key_dates ?? [])
    .map((d) => {
      const fresh = freshDates[d.ticker];
      return fresh
        ? { ...d, earnings_date: fresh.date, confirmed: fresh.confirmed }
        : d;
    })
    .filter((d) => d.earnings_date && daysUntil(d.earnings_date) >= 0)
    .sort((a, b) => a.earnings_date!.localeCompare(b.earnings_date!));

  const showBriefing = !loading && !generating && briefing !== null;
  const creditsLeft = profile ? creditsRemaining(profile) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Masthead ── */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-x-6 gap-y-3 pb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-text-secondary mb-3">
            Morning briefing
          </p>
          {loading ? (
            <div className="h-10 w-64 max-w-full bg-border animate-pulse" />
          ) : (
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
              {fmtMastheadDate(
                showBriefing ? new Date(briefing.generated_at) : new Date()
              )}
            </h1>
          )}
        </div>

        {!loading && !generating && (
          <div className="flex flex-col sm:items-end gap-1 shrink-0">
            {showBriefing && (
              <div className="flex items-baseline gap-4">
                <p className="font-mono text-xs tabular-nums text-text-secondary">
                  Generated {fmtTime(briefing.generated_at)}
                </p>
                {canRegenerate && (
                  <button
                    onClick={handleGenerate}
                    className="font-body text-xs text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            )}
            {creditsLeft !== null &&
              (creditsLeft > 0 ? (
                <p className="font-mono text-xs tabular-nums text-text-secondary">
                  {creditsLeft} briefing{creditsLeft === 1 ? "" : "s"} remaining
                  this month
                </p>
              ) : (
                <a
                  href="/settings"
                  className="font-body text-xs text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors"
                >
                  Upgrade to Premium
                </a>
              ))}
          </div>
        )}
      </header>

      {/* ── Error ── */}
      {error && (
        <p className="border-t border-border py-4 font-body text-sm text-urgent">
          {error}
        </p>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="border-t border-border py-10 flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1 w-full bg-border animate-pulse" />
          ))}
        </div>
      ) : generating ? (
        <GeneratingState />
      ) : briefing ? (
        // Keyed so a new briefing replays the fade.
        <div key={briefing.id}>
          <BriefingDisplay
            briefing={briefing}
            holdings={canaries}
            upcoming={upcoming}
            canRegenerate={canRegenerate}
            onRegenerate={handleGenerate}
          />
        </div>
      ) : profile ? (
        <GeneratePrompt profile={profile} onGenerate={handleGenerate} />
      ) : (
        <p className="border-t border-border py-10 font-body text-sm text-text-secondary">
          Please{" "}
          <a href="/login" className="underline">
            sign in
          </a>{" "}
          to use the AI Advisor.
        </p>
      )}
    </div>
  );
}
