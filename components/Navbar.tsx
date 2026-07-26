"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { CanaryLogoIcon } from "./CanaryIcon";

// Single source of truth so the desktop bar and the mobile dropdown can't drift.
const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

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

  // Mobile menu dismissal. Listeners are attached only while the menu is open,
  // and the menu can only be opened from the md:hidden hamburger — so desktop
  // never registers these at all.
  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const initial = user?.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 bg-background border-b border-border"
    >
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
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-playfair text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="md:hidden flex items-center justify-center -ml-1 p-1 cursor-pointer"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1A1A1A"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>

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
      </div>

      {/* ── Mobile dropdown ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="md:hidden absolute top-full left-0 right-0 bg-surface shadow-card overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block font-playfair text-base text-text-primary py-3 px-6 border-b border-border"
              >
                {link.label}
              </Link>
            ))}

            {/* Auth actions — mirrors the desktop CTAs, full width for thumbs */}
            {authChecked && (
              <div className="flex flex-col gap-3 px-6 py-4">
                {user ? (
                  <Link
                    href="/watchlist"
                    onClick={() => setMenuOpen(false)}
                    className="btn-primary font-playfair text-sm text-center w-full"
                  >
                    My Portfolio →
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="btn-outline font-playfair text-sm text-center w-full"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="btn-primary font-playfair text-sm text-center w-full"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
