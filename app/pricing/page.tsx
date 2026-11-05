import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import UpgradeButton from "@/components/UpgradeButton";

export const metadata: Metadata = {
  title: "Pricing — Canary",
  description:
    "Start free. Upgrade when you're ready. Canary pricing for retail traders.",
};

type PlanValue = string | boolean;

const FEATURES: { name: string; free: PlanValue; premium: PlanValue }[] = [
  { name: "Stocks in your watchlist", free: "5", premium: "Unlimited" },
  { name: "Live prices and P&L", free: true, premium: true },
  { name: "Canary warnings", free: true, premium: true },
  { name: "Latest news and market movers", free: true, premium: true },
  { name: "AI briefings", free: "2 a month", premium: "Unlimited" },
  { name: "Single-stock deep dives", free: false, premium: true },
  { name: "Valuation tools and research guide", free: true, premium: true },
];

const FAQS = [
  {
    question: "Is Canary financial advice?",
    answer:
      "No. Canary shows you information, dates and tools. Every decision is yours.",
  },
  {
    question: "Where does the data come from?",
    answer:
      "Prices and news from Finnhub, fundamentals and market movers from Financial Modeling Prep. Some data can be delayed.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes, any time from Settings. You keep Premium until the end of the period you paid for.",
  },
];

const PREMIUM_NOTE = "or €79 / year, save 34%";

function PlanValueCell({ value }: { value: PlanValue }) {
  if (value === true) {
    return (
      <span role="img" aria-label="Included" className="font-mono text-sm text-positive">
        ✓
      </span>
    );
  }
  if (value === false) {
    return (
      <span
        role="img"
        aria-label="Not included"
        className="font-mono text-sm text-text-secondary"
      >
        —
      </span>
    );
  }
  return (
    <span className="font-mono text-sm tabular-nums text-text-primary">
      {value}
    </span>
  );
}

function PlanHeading({
  name,
  price,
  note,
}: {
  name: string;
  price: string;
  note?: string;
}) {
  return (
    <>
      <span className="block font-display text-2xl font-normal text-text-primary">
        {name}
      </span>
      <span className="block mt-2 font-mono text-sm font-normal tabular-nums text-text-primary">
        {price}
      </span>
      {note && (
        <span className="block mt-1 font-mono text-[11px] font-normal tabular-nums text-text-secondary">
          {note}
        </span>
      )}
    </>
  );
}

function StartFree() {
  return (
    <Link
      href="/signup"
      className="btn-outline inline-block font-playfair text-sm px-6 py-3"
    >
      Start free
    </Link>
  );
}

function Upgrade() {
  return (
    <div className="flex flex-col items-start gap-3 [&_button]:text-left">
      <UpgradeButton plan="monthly" />
      <UpgradeButton plan="annual" variant="link" />
    </div>
  );
}

// The same rows as the table, one plan at a time, for screens too narrow for
// three columns.
function PlanList({
  plan,
  heading,
  action,
}: {
  plan: "free" | "premium";
  heading: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <>
      <h2>{heading}</h2>
      <ul className="mt-6 border-t border-border">
        {FEATURES.map((feature) => (
          <li
            key={feature.name}
            className="flex items-baseline justify-between gap-4 py-3 border-b border-border"
          >
            <span className="font-body text-sm text-text-primary">
              {feature.name}
            </span>
            <span className="shrink-0">
              <PlanValueCell value={feature[plan]} />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{action}</div>
    </>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-28 lg:pb-20">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary mb-5">
          Pricing
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-text-primary leading-tight tracking-tight text-balance mb-5">
          Start free. Upgrade when you&apos;re ready.
        </h1>
        <p className="font-body text-lg text-text-secondary">No card needed.</p>
      </header>

      {/* ── Comparison ── */}
      {/* No vertical padding on the section, so the Premium tint runs edge to
          edge between the rules above and below it. */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <table className="hidden md:table w-full table-fixed border-collapse">
            <caption className="sr-only">
              What you get on the Free and Premium plans
            </caption>
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[30%]" />
              <col className="w-[30%] bg-canary/[0.06]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="pt-10 pb-6 pr-6 text-left align-bottom font-mono text-[10px] font-normal uppercase tracking-wider text-text-secondary"
                >
                  Feature
                </th>
                <th scope="col" className="pt-10 pb-6 px-6 text-left align-top">
                  <PlanHeading name="Free" price="€0" />
                </th>
                <th scope="col" className="pt-10 pb-6 px-6 text-left align-top">
                  <PlanHeading
                    name="Premium"
                    price="€9.99 / month"
                    note={PREMIUM_NOTE}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature) => (
                <tr key={feature.name} className="border-b border-border">
                  <th
                    scope="row"
                    className="py-4 pr-6 text-left font-body text-sm font-normal text-text-primary"
                  >
                    {feature.name}
                  </th>
                  <td className="py-4 px-6">
                    <PlanValueCell value={feature.free} />
                  </td>
                  <td className="py-4 px-6">
                    <PlanValueCell value={feature.premium} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-8 pr-6" />
                <td className="py-8 px-6 align-top">
                  <StartFree />
                </td>
                <td className="py-8 px-6 align-top">
                  <Upgrade />
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="md:hidden">
            <div className="py-10">
              <PlanList
                plan="free"
                heading={<PlanHeading name="Free" price="€0" />}
                action={<StartFree />}
              />
            </div>
            <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 py-10 bg-canary/[0.06]">
              <PlanList
                plan="premium"
                heading={
                  <PlanHeading
                    name="Premium"
                    price="€9.99 / month"
                    note={PREMIUM_NOTE}
                  />
                }
                action={<Upgrade />}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <h2 className="font-mono text-xs font-normal uppercase tracking-widest text-text-secondary mb-8">
            FAQ
          </h2>

          <dl className="border-t border-border">
            {FAQS.map(({ question, answer }) => (
              <div
                key={question}
                className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-6 gap-y-2 py-8 border-b border-border"
              >
                <dt className="font-display text-xl text-text-primary">
                  {question}
                </dt>
                <dd className="font-body text-sm sm:text-base text-text-secondary leading-relaxed">
                  {answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Footnote ── */}
      <p className="font-body text-sm text-text-secondary text-center px-4 pb-20">
        Prices shown in EUR.
      </p>

      <SiteFooter />
    </div>
  );
}
