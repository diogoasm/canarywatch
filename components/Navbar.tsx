"use client";

import Link from "next/link";
import { CanaryLogoIcon } from "./CanaryIcon";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <CanaryLogoIcon size={26} />
            <span className="font-display text-xl font-semibold text-text-primary tracking-tight">
              Canary
            </span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-8">
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
          </div>

          {/* Right CTAs */}
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </div>
    </nav>
  );
}
