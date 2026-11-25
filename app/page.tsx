import type { Metadata } from "next";
import Button from "@/components/Button";
import Navbar from "@/components/Navbar";
import CanaryIcon from "@/components/CanaryIcon";
import CanaryKey from "@/components/CanaryKey";
import FlyingCanaryIntro from "@/components/FlyingCanaryIntro";
import HeroIntelChart from "@/components/HeroIntelChart";
import IntelChart from "@/components/IntelChart";
import MarketMovers from "@/components/MarketMovers";
import NumberedRows from "@/components/NumberedRows";
import SiteFooter from "@/components/SiteFooter";
import { CANARY_MEANING } from "@/lib/canary";
import type { DailyClose } from "@/lib/intelStory";

export const metadata: Metadata = {
  title: "Canary — Know before it moves",
  description:
    "Canary watches your portfolio and warns you before earnings, crashes and key events. Built for retail traders who want intelligence without the noise.",
  // Replaces the layout's openGraph wholesale (no deep merge), so title and
  // siteName are repeated here.
  openGraph: {
    title: "Canary — Know before it moves",
    description:
      "Canary watches your portfolio and warns you before earnings, crashes and key events. Built for retail traders who want intelligence without the noise.",
    siteName: "Canary",
  },
};

const INTC_HISTORY_URL =
  "https://financialmodelingprep.com/stable/historical-price-eod/light?symbol=INTC&from=2026-01-01&to=2026-05-31";

const meaning = (status: "red" | "yellow" | "green") =>
  CANARY_MEANING[status].label.toLowerCase();

const CAPABILITIES = [
  {
    number: "01",
    title: "Canary warnings",
    body: `Every stock you hold gets a canary. Red means ${meaning("red")}, yellow means ${meaning("yellow")}, green means ${meaning("green")}. Checked every time you open the app.`,
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

export default async function Home() {
  const closes = await getIntelCloses();

  return (
    <div className="min-h-screen bg-background">
      {/* Flying canary intro — a fixed overlay above the page; the layout below
          (navbar, hero, content) always renders normally and is unaffected. */}
      <FlyingCanaryIntro />

      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {/* Deliberately not animated. Anything that fades in ships hidden in the
          HTML, so the first thing people see would be waiting on JavaScript. */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-8 min-w-0">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold text-text-primary leading-tight tracking-tight mb-5">
                Know before
                <br />
                it moves.
              </h1>
              <p className="font-body text-base text-text-secondary leading-relaxed">
                Canary warns you before earnings, crashes and key events.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button href="/signup">Get started free</Button>
              <Button href="/how-it-works" kind="secondary">
                See how it works
              </Button>
            </div>
          </div>

          {closes && (
            <div className="min-w-0">
              <HeroIntelChart closes={closes} />
            </div>
          )}
        </div>
      </section>

      {/* ── Why this exists ──────────────────────────────────────────────── */}
      <section id="why" className="scroll-mt-16 border-t border-border">
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

          <NumberedRows rows={CAPABILITIES} />
        </div>
      </section>

      {/* ── What the colours mean ────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="sr-only">What the canary colours mean</h2>
          <CanaryKey />
        </div>
      </section>

      {/* ── Today's market ───────────────────────────────────────────────── */}
      {/* Draws its own section, so nothing is left behind if it can't load. */}
      <MarketMovers
        className="border-t border-border"
        innerClassName="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28"
        heading={
          <div>
            <h2 className="font-mono text-xs font-normal uppercase tracking-widest text-text-secondary mb-3">
              Today&apos;s market
            </h2>
            <p className="font-body text-base text-text-primary">
              The biggest moves among stocks above $10.
            </p>
          </div>
        }
      />

      {/* ── Close ────────────────────────────────────────────────────────── */}
      <section className="on-dark bg-[#1A1A1A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 flex flex-col items-start gap-8">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight text-balance">
            Don&apos;t find out the day after.
          </h2>
          <div className="flex flex-col items-start gap-4">
            <Button href="/signup">Start watching for free</Button>
            <p className="font-mono text-xs text-[#B0B0B0]">
              Free. No card needed.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
