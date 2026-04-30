"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CanaryLogoIcon } from "@/components/CanaryIcon";
import type { TraderType } from "@/types";

const traderOptions: {
  value: TraderType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "I'm just getting started",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="14" fill="#F5C842" fillOpacity="0.12" />
        <path
          d="M9 18l3-4 3 3 4-6"
          stroke="#D4A800"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="11" r="2" fill="#F5C842" />
      </svg>
    ),
  },
  {
    value: "active",
    label: "Active Trader",
    description: "I trade regularly and follow the markets",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="14" fill="#F5C842" fillOpacity="0.12" />
        <path
          d="M7 15l3-5 3 3 3-4 4 5"
          stroke="#D4A800"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="10" r="1.5" fill="#F5C842" />
        <circle cx="19" cy="14" r="1.5" fill="#E03B3B" />
      </svg>
    ),
  },
  {
    value: "experienced",
    label: "Experienced",
    description: "I've been investing for years",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="14" fill="#2D9E6B" fillOpacity="0.10" />
        <path
          d="M8 17l3-6 3 4 2-3 4 4"
          stroke="#2D9E6B"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 9l2 2-2 2"
          stroke="#2D9E6B"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<TraderType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!selected) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    console.log("[onboarding] saving trader_type:", selected, "for user:", user.id);

    // upsert handles both: profile row already created by trigger, or not yet
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, trader_type: selected });

    setSaving(false);

    if (upsertError) {
      console.error("[onboarding] Supabase error:", upsertError);
      setError(`Could not save: ${upsertError.message}`);
      return;
    }

    router.push("/watchlist");
  }

  async function handleSkip() {
    router.push("/watchlist");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <CanaryLogoIcon size={32} />
        <span className="font-display text-xl font-semibold text-text-primary">
          Canary
        </span>
      </div>

      <div className="w-full max-w-xl">
        {/* Heading */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-text-primary mb-3">
            Welcome to Canary.
          </h1>
          <p className="font-body text-base text-text-secondary leading-relaxed">
            Tell us a bit about yourself so we can tailor your experience.
          </p>
        </div>

        {/* Question */}
        <p className="font-body text-sm font-semibold text-text-primary mb-4 text-center">
          How would you describe yourself as a trader?
        </p>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {traderOptions.map((option) => {
            const isSelected = selected === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSelected(option.value)}
                className={`
                  w-full flex items-center gap-4 px-6 py-5 rounded-card text-left
                  border-2 transition-all duration-150 bg-white
                  ${
                    isSelected
                      ? "border-canary shadow-card-canary"
                      : "border-border hover:border-[#D4C89A] shadow-card"
                  }
                `}
              >
                <div className="shrink-0">{option.icon}</div>
                <div>
                  <p
                    className={`font-body text-base font-semibold transition-colors ${
                      isSelected ? "text-text-primary" : "text-text-primary"
                    }`}
                  >
                    {option.label}
                  </p>
                  <p className="font-body text-sm text-text-secondary mt-0.5">
                    {option.description}
                  </p>
                </div>
                {/* Selection indicator */}
                <div className="ml-auto shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-canary bg-canary"
                        : "border-border bg-white"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="#1A1A1A"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="font-body text-sm text-urgent bg-[#FDF2F2] border border-[#FAD4D4] rounded-lg px-4 py-3 mt-4">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 mt-8">
          <button
            onClick={handleContinue}
            disabled={!selected || saving}
            className="btn-primary w-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Continue to my Watchlist"}
          </button>
          <button
            onClick={handleSkip}
            className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
