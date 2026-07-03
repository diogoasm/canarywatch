import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { CanaryLogoIcon } from "@/components/CanaryIcon";

export const metadata: Metadata = {
  title: "How it works — Canary",
  description:
    "Canary is built around one idea: most investors don't lose because they lack information — they lose because they forget to pay attention at the right moment.",
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

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Section 1: Hero ── */}
      <header className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-24 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary mb-6">
          How it works
        </p>
        <h1 className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6">
          Built around one idea.
        </h1>
        <p className="font-body text-lg text-text-secondary leading-relaxed max-w-xl mx-auto">
          Most investors don&apos;t lose because they lack information. They
          lose because they forget to pay attention at the right moment.
        </p>
      </header>

      {/* ── Section 2: The problem ── */}
      <section className="py-20 sm:py-24 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <p className="font-playfair italic text-2xl sm:text-3xl text-text-primary leading-snug">
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
      <section className="py-20 sm:py-24 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 flex flex-col gap-16">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col gap-3">
              <span className="font-mono text-4xl sm:text-5xl text-canary">
                {step.number}
              </span>
              <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-text-primary">
                {step.title}
              </h2>
              <p className="font-body text-base text-text-secondary leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 4: The philosophy ── */}
      <section className="bg-[#1A1A1A] py-24 sm:py-32">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-white mb-8">
            Intelligence without noise.
          </h2>
          <div className="font-body text-base text-white/70 leading-relaxed flex flex-col gap-4 mb-10">
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
          <div className="flex justify-center">
            <CanaryLogoIcon size={32} />
          </div>
        </div>
      </section>

      {/* ── Section 5: CTA ── */}
      <section className="py-24 sm:py-28 text-center px-4 sm:px-6">
        <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-text-primary mb-8">
          Ready to start watching?
        </h2>
        <Link
          href="/signup"
          className="inline-block bg-canary text-[#1A1A1A] font-body text-sm font-bold px-7 py-3 rounded-lg hover:bg-canary-dark transition-colors"
        >
          Create your free account
        </Link>
        <p className="font-body text-sm text-text-secondary mt-5">
          Free forever. No credit card required.
        </p>
      </section>
    </div>
  );
}
