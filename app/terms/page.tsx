import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { CanaryLogoIcon } from "@/components/CanaryIcon";

export const metadata: Metadata = {
  title: "Terms of Service — Canary",
  description:
    "The terms that govern your use of Canary.",
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Header ── */}
      <header className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-20 pb-10 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary mb-5">
          Legal
        </p>
        <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-text-primary leading-tight mb-4">
          Terms of Service
        </h1>
        <p className="font-body text-sm text-text-secondary">
          Last updated: July 2026
        </p>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 pb-24">
        <div className="card p-6 sm:p-10 flex flex-col gap-10">
          <Section title="Acceptance of terms">
            <p>
              By creating an account or using Canary, you agree to these terms.
              If you do not agree with them, please do not use the service.
            </p>
          </Section>

          <Section title="What Canary is">
            <p>
              Canary is a portfolio watching tool. You tell it what you hold and
              what you paid, and it tracks prices, calculates your P&amp;L, and
              flags upcoming earnings dates and events. It also produces
              AI-generated briefings that summarise what is happening across
              your positions.
            </p>
          </Section>

          {/* Disclaimer — deliberately prominent */}
          <section className="rounded-card border-2 border-canary bg-[#FFFBEB] p-5 sm:p-6 flex flex-col gap-3">
            <h2 className="font-playfair text-xl sm:text-2xl font-bold text-text-primary">
              Canary is not financial advice
            </h2>
            <p className="font-body text-sm sm:text-base text-text-primary leading-relaxed">
              Nothing in Canary — including canary warnings, AI briefings,
              valuation tools, research guides, or any other content — is
              financial, investment, tax or legal advice. We are not a broker,
              a financial adviser, or a registered investment adviser. Canary
              never tells you to buy or sell anything. Every investment decision
              you make is your own, and you should consider seeking advice from
              a qualified professional before making one.
            </p>
          </section>

          <Section title="Your responsibilities">
            <p>
              You are responsible for the accuracy of the data you enter.
              Canary calculates your P&amp;L and risk from the share counts and
              purchase prices you provide — if those are wrong, the output will
              be wrong.
            </p>
            <p>
              You are responsible for your own investment decisions, for keeping
              your account credentials secure, and for using the service in a
              lawful way. Do not attempt to scrape, resell, or abuse the
              service or its underlying data providers.
            </p>
          </Section>

          <Section title="Subscription and billing">
            <p>
              Canary offers a free tier with limited watchlist slots and a
              limited number of AI briefings per month, and a Premium tier
              billed monthly or annually through Stripe.
            </p>
            <p>
              Paid subscriptions renew automatically until cancelled. You can
              cancel at any time from your settings; access to Premium features
              continues until the end of the period you have already paid for.
              Unless required by law, payments already made are non-refundable.
            </p>
          </Section>

          <Section title="Data accuracy">
            <p>
              Stock prices, earnings dates, analyst estimates and other market
              data come from third-party providers. This data may be delayed,
              incomplete, or incorrect. AI-generated briefings are produced by a
              language model and may contain errors. Canary is provided
              &ldquo;as is&rdquo;, without warranties of any kind, and we do not
              guarantee that the service will be available, uninterrupted, or
              accurate at any given moment.
            </p>
            <p>Always verify anything important before acting on it.</p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              To the fullest extent permitted by law, Canary and its operators
              are not liable for any investment losses, lost profits, or any
              indirect, incidental or consequential damages arising from your
              use of the service — including losses that follow from inaccurate
              data, a missed or delayed alert, or a briefing you relied on.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              You can delete your account at any time from your settings page.
              We may suspend or terminate an account that breaches these terms,
              abuses the service, or creates risk for other users or our
              providers.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              We may update these terms as the product evolves. When we do, we
              will change the &ldquo;last updated&rdquo; date on this page.
              Continuing to use Canary after a change means you accept the
              updated terms.
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
