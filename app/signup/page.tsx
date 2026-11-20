"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { reportError } from "@/lib/errors";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CanaryLogoIcon } from "@/components/CanaryIcon";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    setLoading(false);

    if (signupError) {
      // Supabase's wording is technical; the one case people can act on
      // (an existing account) gets its own sentence.
      setError(
        /already (registered|exists)/i.test(signupError.message)
          ? "There's already an account with this email. Log in instead."
          : reportError(
              "signup",
              signupError,
              "Couldn't create your account. Check the email address and try again in a moment."
            )
      );
      return;
    }

    // If session exists the project has auto-confirm on — go straight to onboarding
    if (data.session) {
      router.push("/onboarding");
      return;
    }

    // Otherwise email confirmation is required
    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
          <CanaryLogoIcon size={40} />
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary mb-2">
              Check your inbox
            </h1>
            <p className="font-body text-sm text-text-secondary leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="text-text-primary font-medium">{email}</span>.
              Click it to activate your account and get started.
            </p>
          </div>
          <Button href="/login" kind="text" muted>
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link href="/" className="tap flex items-center gap-2 mb-8">
        <CanaryLogoIcon size={28} />
        <span className="font-display text-xl font-semibold text-text-primary">
          Canary
        </span>
      </Link>

      {/* The form sits on the paper itself; no card. */}
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
            Create your account
          </h1>
          <p className="font-body text-sm text-text-secondary">
            Start watching your portfolio for free.
          </p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="font-body text-sm font-medium text-text-primary"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-field rounded-lg font-body text-base text-text-primary placeholder:text-text-secondary hover:border-text-primary focus:border-text-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="font-body text-sm font-medium text-text-primary"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-field rounded-lg font-body text-base text-text-primary placeholder:text-text-secondary hover:border-text-primary focus:border-text-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirm-password"
              className="font-body text-sm font-medium text-text-primary"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-field rounded-lg font-body text-base text-text-primary placeholder:text-text-secondary hover:border-text-primary focus:border-text-primary transition-colors"
            />
          </div>

          {error && (
            <p role="alert" className="font-body text-sm text-urgent-ink bg-[#FDF2F2] border border-[#FAD4D4] rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-1">
            {loading ? "Creating account…" : "Get started free"}
          </Button>
        </form>

        <p className="font-body text-sm text-text-secondary text-center mt-8 pt-6 border-t border-border">
          Already have an account?{" "}
          <Button href="/login" kind="text">
            Log in
          </Button>
        </p>
      </div>

      <p className="font-body text-xs text-text-secondary mt-6 text-center max-w-sm">
        By creating an account you agree to our{" "}
        {/* Kept on one line so the two links' tap areas sit side by side
            instead of overlapping across a line break. */}
        <span className="whitespace-nowrap">
          <Link href="/terms" className="tap hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="tap hover:underline">
            Privacy Policy
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
