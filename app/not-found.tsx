import type { Metadata } from "next";
import Link from "next/link";
import CanaryIcon from "@/components/CanaryIcon";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Page not found — Canary",
};

const LINK_CLASS =
  "font-body text-sm text-text-primary underline underline-offset-4 hover:text-text-secondary transition-colors";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-32 sm:py-40">
        <div aria-hidden="true">
          <CanaryIcon
            status="grey"
            size={64}
            className="-rotate-12 pointer-events-none"
          />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary mt-8">
          404
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-text-primary mt-4">
          This page flew away.
        </h1>
        <p className="font-body text-base text-text-secondary mt-4">
          The link may be old, or the page never existed.
        </p>
        <div className="flex items-center gap-8 mt-10">
          <Link href="/" className={LINK_CLASS}>
            Back to home
          </Link>
          <Link href="/watchlist" className={LINK_CLASS}>
            Your watchlist
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
