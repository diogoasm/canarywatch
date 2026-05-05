"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CanaryLogoIcon } from "@/components/CanaryIcon";
import type { Profile } from "@/types";

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
}

interface BriefingContent {
  portfolio_snapshot: PortfolioSnapshot;
  key_dates: KeyDate[];
  canary_warnings: string[];
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

const MONTHLY_LIMIT = 2;

const LOADING_MESSAGES = [
  "Fetching your portfolio data...",
  "Analysing your positions...",
  "Checking key dates...",
  "Writing your briefing...",
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function creditsRemaining(profile: Profile): number | null {
  if (profile.plan === "premium") return null; // unlimited
  return Math.max(0, MONTHLY_LIMIT - profile.briefings_used);
}

// ─── Credit badge ──────────────────────────────────────────────────────────

function CreditBadge({ profile }: { profile: Profile }) {
  if (profile.plan === "premium") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-canary/15 text-canary-dark font-body text-xs font-semibold px-3 py-1.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-canary inline-block" />
        Unlimited briefings
      </span>
    );
  }

  const remaining = creditsRemaining(profile)!;

  if (remaining === 0) {
    return (
      <a
        href="/settings"
        className="inline-flex items-center gap-1.5 bg-canary text-[#1A1A1A] font-body text-xs font-bold px-3 py-1.5 rounded-full hover:bg-canary-dark transition-colors"
      >
        Upgrade to Premium
      </a>
    );
  }

  return (
    <span className="inline-flex items-center font-body text-xs text-text-secondary bg-background border border-border px-3 py-1.5 rounded-full">
      {remaining} briefing{remaining !== 1 ? "s" : ""} remaining this month
    </span>
  );
}

// ─── Empty / generate state ────────────────────────────────────────────────

function GenerateCard({
  profile,
  onGenerate,
}: {
  profile: Profile;
  onGenerate: () => void;
}) {
  const remaining = creditsRemaining(profile);
  const canGenerate = profile.plan === "premium" || (remaining ?? 0) > 0;

  return (
    <div className="flex items-center justify-center py-16 px-4">
      <div className="card p-10 max-w-md w-full text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-canary/10 flex items-center justify-center">
          <CanaryLogoIcon size={40} />
        </div>

        <div>
          <h2 className="font-display text-xl font-bold text-text-primary mb-2">
            Ready to analyse your portfolio?
          </h2>
          <p className="font-body text-sm text-text-secondary leading-relaxed">
            Canary will review all your holdings and flag what needs your
            attention.
          </p>
        </div>

        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="w-full bg-canary text-[#1A1A1A] font-body text-sm font-bold py-3 px-6 rounded-lg hover:bg-canary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-card-canary"
        >
          Generate My Briefing
        </button>

        {profile.plan === "free" && canGenerate && (
          <p className="font-body text-xs text-text-secondary">
            Uses 1 of your {MONTHLY_LIMIT} monthly briefings
          </p>
        )}

        {!canGenerate && (
          <p className="font-body text-xs text-urgent">
            No briefings remaining.{" "}
            <a href="/settings" className="underline">
              Upgrade to Premium
            </a>{" "}
            for unlimited access.
          </p>
        )}
      </div>
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
    <div className="flex items-center justify-center py-24 px-4">
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

// ─── Briefing cards ────────────────────────────────────────────────────────

function SnapshotCard({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const pnlUp = snapshot.total_pnl_dollars >= 0;

  return (
    <div className="card p-6">
      <h3 className="font-display text-base font-bold text-text-primary mb-5">
        Portfolio Snapshot
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background rounded-lg">
          <p className="font-body text-xs text-text-secondary uppercase tracking-wide mb-1">
            Total Value
          </p>
          <p className="font-mono text-lg font-bold text-text-primary">
            ${fmt(snapshot.total_value)}
          </p>
        </div>

        <div className="p-4 bg-background rounded-lg">
          <p className="font-body text-xs text-text-secondary uppercase tracking-wide mb-1">
            Total P&amp;L
          </p>
          <p
            className={`font-mono text-lg font-bold ${
              pnlUp ? "text-positive" : "text-urgent"
            }`}
          >
            {pnlUp ? "+" : "-"}${fmt(Math.abs(snapshot.total_pnl_dollars))}
          </p>
          <p
            className={`font-mono text-xs ${
              pnlUp ? "text-positive" : "text-urgent"
            }`}
          >
            {pnlUp ? "+" : ""}
            {fmt(snapshot.total_pnl_percent)}%
          </p>
        </div>

        <div className="p-4 bg-background rounded-lg">
          <p className="font-body text-xs text-text-secondary uppercase tracking-wide mb-1">
            Best Performer
          </p>
          {snapshot.best_performer ? (
            <>
              <p className="font-mono text-sm font-bold text-text-primary">
                {snapshot.best_performer.ticker}
              </p>
              <p className="font-mono text-xs text-positive">
                +{fmt(snapshot.best_performer.pnl_percent)}%
              </p>
            </>
          ) : (
            <p className="font-mono text-sm text-text-secondary">—</p>
          )}
        </div>

        <div className="p-4 bg-background rounded-lg">
          <p className="font-body text-xs text-text-secondary uppercase tracking-wide mb-1">
            Worst Performer
          </p>
          {snapshot.worst_performer ? (
            <>
              <p className="font-mono text-sm font-bold text-text-primary">
                {snapshot.worst_performer.ticker}
              </p>
              <p className="font-mono text-xs text-urgent">
                {fmt(snapshot.worst_performer.pnl_percent)}%
              </p>
            </>
          ) : (
            <p className="font-mono text-sm text-text-secondary">—</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KeyDatesCard({ dates }: { dates: KeyDate[] }) {
  return (
    <div className="card p-6 border-l-4 border-l-canary">
      <h3 className="font-display text-base font-bold text-text-primary mb-4">
        Key Dates
      </h3>
      {dates.length === 0 ? (
        <p className="font-body text-sm text-text-secondary">
          No upcoming earnings dates found for your holdings.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {dates.map((d) => {
            const days = d.days_until;
            const isUrgent = days !== null && days <= 7;
            return (
              <div key={d.ticker} className="flex items-center gap-3">
                <div className="w-5 shrink-0">
                  <CanaryLogoIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-sm font-bold text-text-primary">
                    {d.ticker}
                  </span>
                  <span className="font-body text-sm text-text-secondary ml-2">
                    — {d.company_name}
                  </span>
                </div>
                <span
                  className={`font-body text-xs font-medium shrink-0 ${
                    isUrgent ? "text-urgent" : "text-text-secondary"
                  }`}
                >
                  {days !== null
                    ? `Earnings in ${days} day${days === 1 ? "" : "s"}`
                    : "No upcoming earnings found"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WarningsCard({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return (
      <div className="card p-6 border-l-4 border-l-positive">
        <h3 className="font-display text-base font-bold text-text-primary mb-2">
          Canary Warnings
        </h3>
        <p className="font-body text-sm text-positive font-medium">
          No major warnings at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6 border-l-4 border-l-urgent">
      <h3 className="font-display text-base font-bold text-text-primary mb-4">
        Canary Warnings
      </h3>
      <ul className="flex flex-col gap-3">
        {warnings.map((w, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-urgent mt-2 shrink-0" />
            <p className="font-body text-sm text-text-primary leading-relaxed">
              {w}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MarketContextCard({ context }: { context: string }) {
  return (
    <div className="card p-6 border-l-4 border-l-border">
      <h3 className="font-display text-base font-bold text-text-primary mb-3">
        Market Context
      </h3>
      <p className="font-body text-sm text-text-primary leading-relaxed">
        {context}
      </p>
    </div>
  );
}

function OutlookCard({ outlook }: { outlook: string[] }) {
  return (
    <div className="card p-6">
      <h3 className="font-display text-base font-bold text-text-primary mb-4">
        Outlook
      </h3>
      {outlook.length === 0 ? (
        <p className="font-body text-sm text-text-secondary">
          No outlook data available.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {outlook.map((line, i) => {
            const colonIdx = line.indexOf(":");
            const ticker =
              colonIdx > 0 ? line.slice(0, colonIdx).trim() : null;
            const note =
              colonIdx > 0 ? line.slice(colonIdx + 1).trim() : line;
            return (
              <li key={i} className="flex items-start gap-3">
                {ticker && (
                  <span className="font-mono text-xs font-bold text-text-primary bg-background border border-border px-2 py-0.5 rounded mt-0.5 shrink-0">
                    {ticker}
                  </span>
                )}
                <p className="font-body text-sm text-text-primary leading-relaxed">
                  {note}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Full briefing display ─────────────────────────────────────────────────

function BriefingDisplay({
  briefing,
  canRegenerate,
  onRegenerate,
}: {
  briefing: Briefing;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  const c = briefing.content;

  return (
    <div className="flex flex-col gap-5">
      {/* Timestamp + regenerate */}
      <div className="flex items-center justify-between gap-4">
        <p className="font-body text-xs text-text-secondary">
          Generated {fmtDate(briefing.generated_at)}
        </p>
        {canRegenerate && (
          <button
            onClick={onRegenerate}
            className="font-body text-xs font-semibold text-text-secondary border border-border rounded-lg px-3 py-1.5 hover:border-canary hover:text-canary-dark transition-colors"
          >
            Regenerate
          </button>
        )}
      </div>

      <SnapshotCard snapshot={c.portfolio_snapshot} />
      <KeyDatesCard dates={c.key_dates} />
      <WarningsCard warnings={c.canary_warnings} />
      <MarketContextCard context={c.market_context} />
      <OutlookCard outlook={c.outlook} />

      <p className="font-body text-xs text-text-secondary text-center px-4 pb-4 leading-relaxed">
        {c.disclaimer ||
          "This briefing is AI-generated for informational purposes only. Not financial advice. Always do your own research before making investment decisions."}
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdvisorPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

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

      const [profileResult, briefingResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("briefings")
          .select("*")
          .eq("user_id", user.id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.data) setProfile(profileResult.data as Profile);
      if (briefingResult.data)
        setBriefing(briefingResult.data as unknown as Briefing);

      setLoading(false);
    }

    load();
  }, []);

  async function refetchProfile() {
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
  }

  async function handleGenerate() {
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
  }

  const canRegenerate =
    profile !== null &&
    (profile.plan === "premium" ||
      creditsRemaining(profile)! > 0);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            AI Advisor
          </h1>
          <p className="font-body text-sm text-text-secondary mt-1">
            Your personal portfolio briefing.
          </p>
        </div>
        {profile && !loading && (
          <div className="sm:mt-1">
            <CreditBadge profile={profile} />
          </div>
        )}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-6 font-body text-sm text-urgent bg-[#FDF2F2] border border-[#FAD4D4] rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card p-6 animate-pulse"
            >
              <div className="h-4 bg-border rounded w-32 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 bg-background rounded-lg" />
                <div className="h-16 bg-background rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : generating ? (
        <GeneratingState />
      ) : briefing ? (
        <BriefingDisplay
          briefing={briefing}
          canRegenerate={canRegenerate}
          onRegenerate={handleGenerate}
        />
      ) : profile ? (
        <GenerateCard profile={profile} onGenerate={handleGenerate} />
      ) : (
        <div className="card p-8 text-center">
          <p className="font-body text-sm text-text-secondary">
            Please{" "}
            <a href="/login" className="text-canary-dark underline">
              sign in
            </a>{" "}
            to use the AI Advisor.
          </p>
        </div>
      )}
    </div>
  );
}
