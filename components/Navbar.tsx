"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CanaryLogoIcon } from "./CanaryIcon";

export default function Navbar() {
  const reduce = useReducedMotion();

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              className="inline-flex"
              style={{ transformOrigin: "60% 75%" }}
              animate={reduce ? undefined : { rotate: [0, -8, 0] }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1.5,
              }}
            >
              <CanaryLogoIcon size={26} />
            </motion.div>
            <span className="font-display text-xl font-semibold text-text-primary tracking-tight">
              Canary
            </span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="font-playfair text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="font-playfair text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              Pricing
            </Link>
          </div>

          {/* Right CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-body text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-150 hidden sm:block"
            >
              Login
            </Link>
            <Link href="/signup" className="btn-primary text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
