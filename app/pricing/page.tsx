import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import UpgradeButton from "@/components/UpgradeButton";
import { CanaryLogoIcon } from "@/components/CanaryIcon";

export const metadata: Metadata = {
  title: "Pricing — Canary",
  description:
    "Start free. Upgrade when you're ready. Canary pricing for retail traders.",
};

// `dark` lifts the check circle out of the near-invisible 12% tint and swaps
// body copy to light grey, for use on the #1A1A1A Premium section.
function CheckItem({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        className="shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <circle
          cx="9"
          cy="9"
          r="8"
          fill="#2D9E6B"
          opacity={dark ? "0.25" : "0.12"}
        />
        <path
          d="M5.5 9.2l2.3 2.3 4.7-5"
          stroke={dark ? "#4CC48D" : "#2D9E6B"}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={`font-body text-sm sm:text-base leading-relaxed ${
          dark ? "text-[#B0B0B0]" : "text-text-primary"
        }`}
      >
        {children}
      </span>
    </li>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <header className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary mb-5">
          Pricing
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-text-primary leading-tight mb-5">
          Start free. Upgrade when you&apos;re ready.
        </h1>
        <p className="font-body text-lg text-text-secondary">
          No credit card required to get started.
        </p>
      </header>

      {/* ── Free plan ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-10 md:gap-16 items-start">
          <div>
            <h2 className="font-display text-5xl sm:text-6xl font-bold text-text-primary mb-3">
              Free
            </h2>
            <p className="font-mono text-xl text-text-secondary">$0/month</p>
          </div>
          <div>
            <ul className="flex flex-col gap-4 mb-10">
              <CheckItem>Watchlist with up to 5 stocks</CheckItem>
              <CheckItem>Real-time prices and P&amp;L tracking</CheckItem>
              <CheckItem>
                Canary warning system (automatic flags on page load)
              </CheckItem>
              <CheckItem>2 AI portfolio briefings per month</CheckItem>
              <CheckItem>Research Guide and Valuation Tools</CheckItem>
            </ul>
            <Link
              href="/signup"
              className="inline-block bg-canary text-[#1A1A1A] font-playfair text-sm font-bold px-6 py-3 rounded-lg hover:bg-canary-dark transition-colors"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Light → dark transition ── */}
      {/* A gradient strip rather than a hard edge, so the switch into the
          Premium section reads as a fade instead of a seam. */}
      <div
        aria-hidden
        className="h-20 sm:h-28 bg-gradient-to-b from-background to-[#1A1A1A]"
      />

      {/* ── Premium plan (dark) ── */}
      <section className="bg-[#1A1A1A] pb-24 sm:pb-32">
        {/* Divider — now sits on the dark side of the transition */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center gap-5 pb-16 sm:pb-20">
          <div className="flex-1 h-px bg-[#3A3A3A]" />
          <p className="font-mono text-xs uppercase tracking-widest text-[#B0B0B0]">
            Ready for more?
          </p>
          <div className="flex-1 h-px bg-[#3A3A3A]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-[#2A2A2A] rounded-2xl border border-[#3A3A3A] p-8 sm:p-12 grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            <div>
              <h2 className="font-playfair text-5xl sm:text-6xl font-bold text-white mb-3">
                Premium
              </h2>
              <p className="font-mono text-xl text-white">€9.99/month</p>
              <p className="font-body text-sm text-[#B0B0B0] mt-2">
                or €79/year — save 34%
              </p>
            </div>
            <div>
              <p className="font-body text-sm font-medium text-[#B0B0B0] uppercase tracking-wide mb-4">
                Everything in Free, plus:
              </p>
              <ul className="flex flex-col gap-4 mb-10">
                <CheckItem dark>Unlimited stocks in your watchlist</CheckItem>
                <CheckItem dark>Unlimited AI portfolio briefings</CheckItem>
                <CheckItem dark>Single-stock deep dive briefings</CheckItem>
                <CheckItem dark>Priority data refresh</CheckItem>
              </ul>
              <div className="flex flex-col items-start gap-3">
                <UpgradeButton plan="monthly" />
                <UpgradeButton plan="annual" variant="link" dark />
              </div>
            </div>
          </div>
        </div>

        {/* Closing canary — mirrors the How It Works philosophy section */}
        <div className="flex justify-center pt-16 sm:pt-20">
          <CanaryLogoIcon size={32} />
        </div>
      </section>

      {/* ── Dark → light transition ── */}
      <div
        aria-hidden
        className="h-20 sm:h-28 bg-gradient-to-b from-[#1A1A1A] to-background"
      />

      {/* ── Footnote ── */}
      <p className="font-body text-sm text-text-secondary text-center px-4 pb-20">
        Prices shown in EUR. Canary is built for retail traders, not Wall
        Street.
      </p>
    </div>
  );
}
