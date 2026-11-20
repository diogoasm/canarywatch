"use client";

import Button from "@/components/Button";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Premium checkout CTA on the public /pricing page. Logged-out visitors
// are sent to signup first; logged-in users go straight to Stripe Checkout.
export default function UpgradeButton({
  plan,
  variant = "primary",
  dark = false,
}: {
  plan: "monthly" | "annual";
  variant?: "primary" | "link";
  // Set on dark (#1A1A1A / #2A2A2A) sections — only affects the link variant,
  // since the primary button's canary yellow already reads on both.
  dark?: boolean;
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
        <Button
          kind="text"
          muted
          onClick={handleUpgrade}
          disabled={loading}
          className={
            dark
              ? "!text-[#B0B0B0] !decoration-[#B0B0B0]/40 hover:!text-white hover:!decoration-white"
              : ""
          }
        >
          {loading ? "Redirecting…" : "Or upgrade annually for €79 a year"}
        </Button>
        {error && (
          <span className="block font-body text-xs text-urgent-ink mt-2">
            {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <span>
      <Button onClick={handleUpgrade} disabled={loading}>
        {loading ? "Redirecting to checkout…" : "Upgrade"}
      </Button>
      {error && (
        <span className="block font-body text-xs text-urgent-ink mt-2">{error}</span>
      )}
    </span>
  );
}
