"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { CanaryLogoIcon } from "./CanaryIcon";

interface NavbarProps {
  enableIntro?: boolean;
  onIntroDone?: () => void;
}

export default function Navbar({ enableIntro = false, onIntroDone }: NavbarProps) {
  const logoControls = useAnimation();
  const reduce = useReducedMotion();
  const ranRef = useRef(false);
  const [contentVisible, setContentVisible] = useState(!enableIntro);

  useEffect(() => {
    if (!enableIntro || ranRef.current) return;
    ranRef.current = true;

    if (reduce) {
      setContentVisible(true);
      onIntroDone?.();
      return;
    }

    let cancelled = false;
    async function run() {
      await logoControls.start({
        x: window.innerWidth,
        rotate: 15,
        scale: 1.8,
        transition: { duration: 0.8, ease: "easeIn" },
      });
      if (cancelled) return;
      await logoControls.start({
        x: 0,
        y: 0,
        scale: 1,
        rotate: -5,
        transition: { duration: 0.6, ease: "easeOut" },
      });
      if (cancelled) return;
      await logoControls.start({
        rotate: 0,
        transition: { duration: 0.2 },
      });
      if (cancelled) return;
      setContentVisible(true);
      onIntroDone?.();
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [enableIntro, reduce, logoControls, onIntroDone]);

  const animateIntro = enableIntro && !reduce;
  const initialLogo = animateIntro
    ? { x: -100, y: 0, scale: 1.8, rotate: 0, opacity: 1 }
    : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 };

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.span
              initial={initialLogo}
              animate={animateIntro ? logoControls : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
              className="inline-flex"
            >
              <CanaryLogoIcon size={26} />
            </motion.span>
            <motion.span
              initial={{ opacity: contentVisible ? 1 : 0 }}
              animate={{ opacity: contentVisible ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              className="font-display text-xl font-semibold text-text-primary tracking-tight"
            >
              Canary
            </motion.span>
          </Link>

          {/* Center nav links */}
          <motion.div
            initial={{ opacity: contentVisible ? 1 : 0 }}
            animate={{ opacity: contentVisible ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            className="hidden md:flex items-center gap-8"
          >
            <Link
              href="#features"
              className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              Pricing
            </Link>
          </motion.div>

          {/* Right CTAs */}
          <motion.div
            initial={{ opacity: contentVisible ? 1 : 0 }}
            animate={{ opacity: contentVisible ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <Link
              href="/login"
              className="font-body text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-150 hidden sm:block"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="btn-primary text-sm"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </div>
    </nav>
  );
}
