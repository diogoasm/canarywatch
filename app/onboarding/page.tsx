"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import { PLAIN, reportError } from "@/lib/errors";
import { CanaryLogoIcon } from "@/components/CanaryIcon";
import type { TraderType } from "@/types";

const traderOptions: {
  value: TraderType;
  label: string;
  description: string;
}[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "I'm just getting started",
  },
  {
    value: "active",
    label: "Active trader",
    description: "I trade regularly and follow the markets",
  },
  {
    value: "experienced",
    label: "Experienced",
    description: "I've been investing for years",
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
      setError(reportError("onboarding", upsertError, PLAIN.save));
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

        {/* Native radios: arrow keys move between options and screen
            readers announce "1 of 3, selected". The inputs are visually
            hidden; each card is the label, and shows the ring when its
            input has keyboard focus. */}
        <fieldset>
          <legend className="font-body text-sm font-semibold text-text-primary mb-4 text-center w-full">
            How would you describe yourself as a trader?
          </legend>

          {/* Ruled rows, not cards: the chosen one gets the same 2px canary
              bar as the active sidebar item. */}
          <div className="border-t border-border">
            {traderOptions.map((option) => {
              const isSelected = selected === option.value;
              return (
                <label
                  key={option.value}
                  className={`
                    w-full flex items-center gap-4 pl-5 pr-4 py-5 text-left cursor-pointer
                    border-b border-border border-l-2 transition-colors duration-150
                    has-[:focus-visible]:outline has-[:focus-visible]:outline-2
                    has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[#1A1A1A]
                    ${
                      isSelected
                        ? "border-l-canary bg-canary/10"
                        : "border-l-transparent hover:bg-[#1A1A1A]/[0.03]"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="trader-type"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setSelected(option.value)}
                    className="sr-only"
                  />
                  <span className="block">
                    <span className="block font-body text-base font-semibold text-text-primary">
                      {option.label}
                    </span>
                    <span className="block font-body text-sm text-text-secondary mt-0.5">
                      {option.description}
                    </span>
                  </span>
                  {/* Selection indicator */}
                  <span aria-hidden="true" className="ml-auto shrink-0">
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "border-[#1A1A1A] bg-canary"
                          : "border-field bg-transparent"
                      }`}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M2 5l2.5 2.5L8 3"
                            stroke="#1A1A1A"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="font-body text-sm text-urgent-ink bg-[#FDF2F2] border border-[#FAD4D4] rounded-lg px-4 py-3 mt-4">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 mt-8">
          <Button
            onClick={handleContinue}
            disabled={!selected || saving}
            className="w-full"
          >
            {saving ? "Saving…" : "Continue to my watchlist"}
          </Button>
          <Button kind="text" muted onClick={handleSkip}>
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
