"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CanaryLogoIcon } from "./CanaryIcon";

export default function Navbar() {
  useEffect(() => {
    console.log("navbar mounted");
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              animate={{ rotate: [0, -8, 0] }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1.5,
              }}
              style={{ transformOrigin: "60% 75%", display: "inline-block" }}
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
            <Link href="/signup">
              <button className="btn-primary text-sm">Get Started</button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
