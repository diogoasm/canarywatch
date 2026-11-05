import Link from "next/link";
import Navbar from "@/components/Navbar";
import CanaryIcon, { CanaryLogoIcon } from "@/components/CanaryIcon";
import IntelChart, { type DailyClose } from "@/components/IntelChart";
import MarketMovers from "@/components/MarketMovers";
import Reveal from "@/components/Reveal";

const INTC_HISTORY_URL =
  "https://financialmodelingprep.com/stable/historical-price-eod/light?symbol=INTC&from=2026-01-01&to=2026-05-31";

const CAPABILITIES = [
  {
    number: "01",
    title: "Canary warnings",
    body: "Every stock you hold gets a canary. Red means act soon, yellow means watch, green means good news. Checked every time you open the app.",
  },
  {
    number: "02",
    title: "Briefings on your numbers",
    body: "A short memo built from what you actually paid and how much you hold. Not generic market commentary.",
  },
  {
    number: "03",
    title: "Tools to decide yourself",
    body: "DCF and DDM valuation, a research guide, and a pre-trade checklist. Canary never tells you to buy or sell.",
  },
];

// Returns null on failure: the story still reads without the chart.
async function getIntelCloses(): Promise<DailyClose[] | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${INTC_HISTORY_URL}&apikey=${apiKey}`, {
      next: { revalidate: 86400 }, // history never changes
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return null;

    // The light endpoint calls the close `price` and lists newest first.
    return (data as { date: string; price: number }[])
      .map(({ date, price }) => ({ date, close: price }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return null;
  }
}

// Numbers and dates stay in DM Mono, even inside body copy.
function Figure({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.92em] tabular-nums whitespace-nowrap">
      {children}
    </span>
  );
}

export default async function FeaturesPage() {
  const closes = await getIntelCloses();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <Reveal className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-8 min-w-0">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight tracking-tight mb-5">
                Know before
                <br />
                it moves.
              </h1>
              <p className="font-body text-base text-text-secondary leading-relaxed">
                Canary warns you before earnings, crashes and key events.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                href="/signup"
                className="btn-primary font-playfair text-sm px-6 py-2.5"
              >
                Get started free
              </Link>
              <Link
                href="/"
                className="btn-outline font-playfair text-sm px-6 py-2.5"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="min-w-0">
            <MarketMovers />
          </div>
        </Reveal>
      </section>

      {/* ── Why this exists ──────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <p className="font-mono text-xs uppercase tracking-widest text-text-secondary mb-5">
            Why this exists
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight tracking-tight text-balance">
            I sold Intel two days before earnings.
          </h2>

          {closes && <IntelChart closes={closes} />}

          <div className="mt-12 max-w-[60ch] font-body text-base sm:text-lg text-text-primary leading-relaxed space-y-5">
            <p>
              I bought Intel in January and sold it on{" "}
              <Figure>21 April</Figure>, up <Figure>50%</Figure>. I was happy
              with that.
            </p>
            <p>
              Two days later Intel reported earnings. The next day the stock
              rose about <Figure>24%</Figure>, its biggest one-day gain since{" "}
              <Figure>1987</Figure>. I hadn&apos;t looked at the date. A tool
              that knew what I held would have told me. So I built one.
            </p>
          </div>

          <p className="mt-6 font-mono text-xs text-text-secondary">
            — Diogo, founder
          </p>

          <div className="mt-10 flex items-center gap-3 border-l-2 border-canary pl-4 py-1">
            <CanaryIcon status="red" size={16} className="shrink-0" />
            <p className="font-body text-sm text-text-primary">
              <span className="block sm:inline">
                Canary would have flagged it:{" "}
              </span>
              <span className="font-mono tabular-nums">
                INTC · earnings in 2 days
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ── What Canary does ─────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <h2 className="font-mono text-xs font-normal uppercase tracking-widest text-text-secondary mb-8">
            What Canary does
          </h2>

          <ol className="border-t border-border">
            {CAPABILITIES.map(({ number, title, body }, index) => (
              <li key={number} className="border-b border-border">
                <Reveal
                  delay={index * 0.06}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] md:grid-cols-[4rem_minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-x-4 md:gap-x-6 gap-y-2 py-8 sm:py-10"
                >
                  <span className="font-mono text-sm tabular-nums text-canary">
                    {number}
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl text-text-primary">
                    {title}
                  </h3>
                  <p className="col-start-2 md:col-start-3 font-body text-sm sm:text-base text-text-secondary leading-relaxed">
                    {body}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────────────────── */}
      <section className="bg-[#1A1A1A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 flex flex-col items-start gap-8">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight text-balance">
            Don&apos;t find out the day after.
          </h2>
          <div className="flex flex-col items-start gap-4">
            <Link
              href="/signup"
              className="btn-primary font-playfair text-sm px-6 py-2.5"
            >
              Start watching for free
            </Link>
            <p className="font-mono text-xs text-[#B0B0B0]">
              Free. No card needed.
            </p>
          </div>
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
