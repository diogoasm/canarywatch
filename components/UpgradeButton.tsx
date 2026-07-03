"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Premium checkout CTA on the public /pricing page. Logged-out visitors
// are sent to signup first; logged-in users go straight to Stripe Checkout.
export default function UpgradeButton({
  plan,
  variant = "primary",
}: {
  plan: "monthly" | "annual";
  variant?: "primary" | "link";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/signup?next=/pricing");
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          userId: session.user.id,
          userEmail: session.user.email,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setError(json.error ?? "Failed to start checkout. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (variant === "link") {
    return (
      <span>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="font-body text-sm text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors disabled:opacity-50"
        >
          {loading ? "Redirecting…" : "or upgrade annually — €79/year"}
        </button>
        {error && (
          <span className="block font-body text-xs text-urgent mt-2">
            {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <span>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-block bg-canary text-[#1A1A1A] font-body text-sm font-bold px-6 py-3 rounded-lg hover:bg-canary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Redirecting to checkout…" : "Upgrade to Premium →"}
      </button>
      {error && (
        <span className="block font-body text-xs text-urgent mt-2">{error}</span>
      )}
    </span>
  );
}
