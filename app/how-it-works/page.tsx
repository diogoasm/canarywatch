import type { Metadata } from "next";
import Button from "@/components/Button";
import Navbar from "@/components/Navbar";
import { CanaryLogoIcon } from "@/components/CanaryIcon";
import NumberedRows from "@/components/NumberedRows";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Canary watches your portfolio and warns you before earnings, crashes and key events. Built for retail traders who want intelligence without the noise.",
  // Replaces the layout's openGraph wholesale (no deep merge), so title and
  // siteName are repeated here.
  openGraph: {
    title: "How it works",
    description:
      "Canary watches your portfolio and warns you before earnings, crashes and key events. Built for retail traders who want intelligence without the noise.",
    siteName: "Canary",
  },
};

const STEPS = [
  {
    number: "01",
    title: "Add your positions",
    body: "Tell Canary what you hold and what you paid. That's all it needs to start watching for you.",
  },
  {
    number: "02",
    title: "Your canary watches",
    body: "Every time you open Canary, it checks earnings dates, sector movements and key events for every stock you hold. The colour of your canary tells you what needs attention — before it becomes a problem.",
  },
  {
    number: "03",
    title: "You make the decision",
    body: "Canary never tells you to buy or sell. It gives you the information, the context, and the tools. The judgment is always yours. That's the point.",
  },
];

// The homepage grid: same width, same gutters, everything off the left edge.
const CONTAINER = "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Section 1: Hero ── */}
      <header className={`${CONTAINER} pt-20 pb-16 lg:pt-28 lg:pb-20`}>
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary mb-5">
          How it works
        </p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight tracking-tight text-balance mb-5">
          Built around one idea.
        </h1>
        <p className="font-body text-lg text-text-secondary leading-relaxed max-w-[60ch]">
          Most investors don&apos;t lose because they lack information. They
          lose because they forget to pay attention at the right moment.
        </p>
      </header>

      {/* ── Section 2: The problem ── */}
      <section className="border-t border-border">
        <div
          className={`${CONTAINER} py-20 sm:py-28 grid md:grid-cols-2 gap-10 md:gap-16 items-start`}
        >
          <p className="font-display italic text-2xl sm:text-3xl text-text-primary leading-snug">
            &ldquo;You did your research. You bought the stock. Then life
            happened.&rdquo;
          </p>
          <div className="font-body text-base text-text-secondary leading-relaxed flex flex-col gap-4">
            <p>
              Earnings sneak up. Sector news breaks overnight. A position you
              forgot about moves 20% while you weren&apos;t watching. Not
              because you made a bad decision — because you stopped paying
              attention.
            </p>
            <p>
              Canary exists to solve exactly this. Not to tell you what to do.
              To make sure you never get blindsided again.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 3: How Canary works ── */}
      <section className="border-t border-border">
        <div className={`${CONTAINER} py-20 sm:py-28`}>
          <NumberedRows rows={STEPS} titleAs="h2" />
        </div>
      </section>

      {/* ── Section 4: The philosophy ── */}
      <section className="on-dark bg-[#1A1A1A]">
        <div className={`${CONTAINER} py-20 sm:py-28`}>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight text-balance mb-8">
            Intelligence without noise.
          </h2>
          <div className="max-w-[60ch] font-body text-base text-white/70 leading-relaxed flex flex-col gap-4 mb-10">
            <p>
              Most financial tools try to do too much. They overwhelm you with
              data, push you toward decisions, and make money when you trade
              more.
            </p>
            <p>
              Canary is different. It&apos;s a watching tool, not a trading
              tool. It respects that you already know how to research — it just
              makes sure you never forget to.
            </p>
          </div>
          <CanaryLogoIcon size={32} />
        </div>
      </section>

      {/* ── Section 5: CTA ── */}
      <section>
        <div
          className={`${CONTAINER} py-20 sm:py-28 flex flex-col items-start gap-8`}
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight tracking-tight text-balance">
            Ready to start watching?
          </h2>
          <div className="flex flex-col items-start gap-4">
            <Button href="/signup">Create your free account</Button>
            <p className="font-mono text-xs text-text-secondary">
              Free. No card needed.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
