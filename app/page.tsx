"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { CanaryLogoIcon } from "@/components/CanaryIcon";

const INTRO_KEY = "canary-intro-played";

const MotionLink = motion(Link);

// ─── Yellow CTA button ──────────────────────────────────────────────────────

function CanaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <MotionLink
      href={href}
      whileHover={reduce ? undefined : { scale: 1.03 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="inline-block bg-canary text-text-primary font-body font-semibold text-base px-7 py-3 rounded-lg shadow-sm hover:bg-canary-dark"
    >
      {children}
    </MotionLink>
  );
}

// ─── Flying canary intro overlay ────────────────────────────────────────────
// Self-contained fixed overlay. The page (navbar + content) renders normally
// beneath it and is never affected. Unmounts itself once the flight completes.

function FlyingCanaryOverlay({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] pointer-events-none"
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <motion.div
        className="absolute"
        style={{ top: "45%", left: -60 }}
        initial={{ x: 0, opacity: 0, rotate: 0, y: 0 }}
        animate={{
          x: ["0vw", "60vw", "115vw"],
          opacity: [0, 1, 1, 0],
          rotate: [0, 12, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 1.2,
          ease: "easeInOut",
          opacity: { duration: 1.2, times: [0, 0.17, 0.83, 1] },
        }}
        onAnimationComplete={onDone}
      >
        <CanaryLogoIcon size={64} />
      </motion.div>
    </motion.div>
  );
}

// ─── Story statement ────────────────────────────────────────────────────────

function Statement({
  label,
  statement,
  caption,
  divider,
}: {
  label: string;
  statement: string;
  caption: string;
  divider?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`min-h-[40vh] flex flex-col items-center justify-center text-center px-6 ${
        divider ? "border-t border-border" : ""
      }`}
    >
      <span className="font-mono text-xs uppercase tracking-[0.25em] text-text-secondary mb-6">
        {label}
      </span>
      <p className="font-display italic text-3xl md:text-5xl leading-tight text-text-primary max-w-3xl">
        {statement}
      </p>
      <p className="font-body text-base md:text-lg text-text-secondary mt-6 max-w-xl">
        {caption}
      </p>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const reduce = useReducedMotion();
  // "pending" until we know on the client; "playing" while the canary flies;
  // "done" once it has passed (or immediately, for returning / reduced users).
  const [introState, setIntroState] = useState<"pending" | "playing" | "done">(
    "pending",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasPlayed = sessionStorage.getItem(INTRO_KEY) === "1";
    if (hasPlayed || reduce) {
      setIntroState("done");
    } else {
      setIntroState("playing");
    }
    sessionStorage.setItem(INTRO_KEY, "1");
  }, [reduce]);

  const showIntro = introState === "playing";

  // Hero stays hidden until we know the intro state, then fades in — after the
  // canary passes when the intro plays, immediately otherwise. It can never get
  // stuck hidden: the animation target is always visible.
  const heroAnimate =
    introState === "pending" ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {showIntro && (
          <FlyingCanaryOverlay onDone={() => setIntroState("done")} />
        )}
      </AnimatePresence>

      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={heroAnimate}
          transition={{
            duration: 0.6,
            ease: "easeOut",
            delay: showIntro ? 1.1 : 0,
          }}
          className="flex flex-col items-center text-center"
        >
          <h1 className="font-display font-bold text-text-primary tracking-tight leading-[1.05] text-[15vw] sm:text-7xl lg:text-[80px]">
            Know before
            <br />
            it moves.
          </h1>
          <p className="font-body text-lg text-text-secondary mt-7 max-w-[34rem]">
            Built for retail traders who want intelligence without the noise.
          </p>
          <div className="mt-10">
            <CanaryButton href="/signup">Start watching for free</CanaryButton>
          </div>
        </motion.div>

        {/* Warm gradient fading the hero into the story below */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#F1ECE1]" />
      </section>

      {/* ── Story ────────────────────────────────────────────────────────── */}
      <section id="story" className="max-w-4xl mx-auto">
        <Statement
          label="Awareness"
          statement="Every key date, flagged before it costs you."
          caption="Earnings dates, sector shifts, key events — your canary catches them first."
        />
        <Statement
          label="Intelligence"
          statement="Get a briefing built around your actual positions, not generic market noise."
          caption="Real P&L. Real context. Specific to what you hold."
          divider
        />
        <Statement
          label="Clarity"
          statement="Everything you need to stay ahead."
          caption="Your canary watches. You decide."
          divider
        />
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-[#1A1A1A]">
        <div className="max-w-3xl mx-auto px-6 py-28 flex flex-col items-center text-center">
          <CanaryLogoIcon size={40} />
          <h2 className="font-display font-bold text-white text-4xl md:text-5xl mt-8">
            Start watching for free.
          </h2>
          <p className="font-body text-base text-[#A8A8A8] mt-4">
            No credit card required.
          </p>
          <div className="mt-9">
            <CanaryButton href="/signup">Create your account</CanaryButton>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#1A1A1A] border-t border-[#2A2A2A]">
        <div className="max-w-6xl mx-auto px-6 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CanaryLogoIcon size={20} />
            <span className="font-display text-base font-semibold text-white">
              Canary
            </span>
          </div>
          <p className="font-body text-sm text-[#8A8A8A]">© 2026 Canary</p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="font-body text-sm text-[#8A8A8A] hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <span className="text-[#3A3A3A]">·</span>
            <Link
              href="/terms"
              className="font-body text-sm text-[#8A8A8A] hover:text-white transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
