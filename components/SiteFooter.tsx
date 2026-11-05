import Link from "next/link";
import { CanaryLogoIcon } from "@/components/CanaryIcon";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <CanaryLogoIcon size={22} />
            <span className="font-display text-base font-semibold text-text-primary">
              Canary
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="font-playfair text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="font-playfair text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Terms
            </Link>
          </div>

          {/* Tagline */}
          <p className="font-body text-sm text-text-secondary italic">
            Built for retail traders. Not Wall Street.
          </p>
        </div>
      </div>
    </footer>
  );
}
