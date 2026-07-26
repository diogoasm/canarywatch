import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { CanaryLogoIcon } from "@/components/CanaryIcon";

export const metadata: Metadata = {
  title: "Privacy Policy — Canary",
  description:
    "How Canary collects, uses and protects your data.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-playfair text-xl sm:text-2xl font-bold text-text-primary">
        {title}
      </h2>
      <div className="font-body text-sm sm:text-base text-text-secondary leading-relaxed flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Header ── */}
      <header className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-20 pb-10 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary mb-5">
          Legal
        </p>
        <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-text-primary leading-tight mb-4">
          Privacy Policy
        </h1>
        <p className="font-body text-sm text-text-secondary">
          Last updated: July 2026
        </p>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 pb-24">
        <div className="card p-6 sm:p-10 flex flex-col gap-10">
          <Section title="What data we collect">
            <p>
              <strong className="text-text-primary font-semibold">
                Account data.
              </strong>{" "}
              Your email address and authentication details when you create an
              account.
            </p>
            <p>
              <strong className="text-text-primary font-semibold">
                Portfolio data.
              </strong>{" "}
              The tickers you add to your watchlist, the number of shares you
              hold, and the price you paid. You choose what to enter — Canary
              never connects to your brokerage.
            </p>
            <p>
              <strong className="text-text-primary font-semibold">
                Usage data.
              </strong>{" "}
              Basic information about how you use the service, such as which
              pages you visit and how many briefings you generate, so we can
              keep the product working and enforce plan limits.
            </p>
          </Section>

          <Section title="How we use it">
            <p>
              We use your data to provide the service: to show your watchlist
              and P&amp;L, to flag upcoming earnings and events, and to generate
              your personalised Canary briefings. Your portfolio data is sent to
              our AI provider only to produce the briefing you requested.
            </p>
            <p>
              We do not sell your data, and we do not use it for advertising.
            </p>
          </Section>

          <Section title="Third party services">
            <p>
              Canary relies on a small number of providers to operate:
            </p>
            <ul className="flex flex-col gap-2 list-disc pl-5">
              <li>
                <strong className="text-text-primary font-semibold">
                  Supabase
                </strong>{" "}
                — authentication and database hosting for your account and
                portfolio data.
              </li>
              <li>
                <strong className="text-text-primary font-semibold">
                  Stripe
                </strong>{" "}
                — payment processing for Premium subscriptions. Card details are
                handled entirely by Stripe; we never see or store them.
              </li>
              <li>
                <strong className="text-text-primary font-semibold">
                  Finnhub and Financial Modeling Prep
                </strong>{" "}
                — market and stock data. We send them ticker symbols, not
                personal information.
              </li>
              <li>
                <strong className="text-text-primary font-semibold">
                  Anthropic
                </strong>{" "}
                — the AI model that writes your briefings. Your positions are
                included in the request that generates a briefing.
              </li>
            </ul>
          </Section>

          <Section title="Data storage and security">
            <p>
              Your data is stored in a Supabase-hosted Postgres database,
              encrypted at rest and in transit. Access is restricted by
              row-level security so that your portfolio is only readable by your
              own authenticated account.
            </p>
            <p>
              No system is perfectly secure, but we keep the amount of data we
              hold deliberately small — we ask for nothing we do not need.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              You can delete your account at any time from your settings page.
              Deleting your account removes your portfolio data and account
              record from our database.
            </p>
            <p>
              You can request an export of the data we hold about you, and you
              can ask us to correct anything that is inaccurate.
            </p>
          </Section>

          <Section title="Contact">
            <p>For questions, contact us at canarywatch.io</p>
          </Section>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <CanaryLogoIcon size={22} />
              <span className="font-display text-base font-semibold text-text-primary">
                Canary
              </span>
            </div>

            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="font-playfair text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="font-playfair text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Terms
              </Link>
            </div>

            <p className="font-body text-sm text-text-secondary italic">
              Built for retail traders. Not Wall Street.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
