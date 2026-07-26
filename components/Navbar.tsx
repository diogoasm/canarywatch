"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { CanaryLogoIcon } from "./CanaryIcon";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const initial = user?.email?.charAt(0).toUpperCase() ?? "?";

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
              href="/#features"
              className="font-playfair text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              className="font-playfair text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              How it works
            </Link>
            <Link
              href="/pricing"
              className="font-playfair text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              Pricing
            </Link>
          </div>

          {/* Right CTAs — hidden until auth state is known to avoid a flash */}
          <div
            className={`flex items-center gap-3 transition-opacity duration-150 ${
              authChecked ? "opacity-100" : "opacity-0"
            }`}
          >
            {user ? (
              <>
                <Link href="/watchlist">
                  <button className="btn-primary font-playfair text-xs px-3 py-1.5">
                    My Portfolio →
                  </button>
                </Link>
                <Link
                  href="/settings"
                  className="w-9 h-9 rounded-full bg-canary text-[#1A1A1A] font-body text-sm font-bold flex items-center justify-center hover:bg-canary-dark transition-colors"
                  title={user.email ?? "Settings"}
                  aria-label="Account settings"
                >
                  {initial}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="font-playfair text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-150 hidden sm:block"
                >
                  Login
                </Link>
                <Link href="/signup">
                  <button className="btn-primary font-playfair text-sm px-3 py-1.5">
                    Get Started
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
