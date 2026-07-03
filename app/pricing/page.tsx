import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import UpgradeButton from "@/components/UpgradeButton";

export const metadata: Metadata = {
  title: "Pricing — Canary",
  description:
    "Start free. Upgrade when you're ready. Canary pricing for retail traders.",
};

function CheckItem({ children }: { children: React.ReactNode }) {
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
        <circle cx="9" cy="9" r="8" fill="#2D9E6B" opacity="0.12" />
        <path
          d="M5.5 9.2l2.3 2.3 4.7-5"
          stroke="#2D9E6B"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-body text-sm sm:text-base text-text-primary leading-relaxed">
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
              className="inline-block bg-canary text-[#1A1A1A] font-body text-sm font-bold px-6 py-3 rounded-lg hover:bg-canary-dark transition-colors"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center gap-5">
        <div className="flex-1 h-px bg-border" />
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">
          Ready for more?
        </p>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Premium plan ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl shadow-card-hover border border-border p-8 sm:p-12 grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            <div>
              <h2 className="font-display text-5xl sm:text-6xl font-bold text-text-primary mb-3">
                Premium
              </h2>
              <p className="font-mono text-xl text-text-primary">
                €9.99/month
              </p>
              <p className="font-body text-sm text-text-secondary mt-2">
                or €79/year — save 34%
              </p>
            </div>
            <div>
              <p className="font-body text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">
                Everything in Free, plus:
              </p>
              <ul className="flex flex-col gap-4 mb-10">
                <CheckItem>Unlimited stocks in your watchlist</CheckItem>
                <CheckItem>Unlimited AI portfolio briefings</CheckItem>
                <CheckItem>Single-stock deep dive briefings</CheckItem>
                <CheckItem>Priority data refresh</CheckItem>
              </ul>
              <div className="flex flex-col items-start gap-3">
                <UpgradeButton plan="monthly" />
                <UpgradeButton plan="annual" variant="link" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footnote ── */}
      <p className="font-body text-sm text-text-secondary text-center px-4 pb-20">
        Prices shown in EUR. Canary is built for retail traders, not Wall
        Street.
      </p>
    </div>
  );
}
