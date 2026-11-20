"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CanaryLogoIcon } from "@/components/CanaryIcon";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/watchlist";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginError) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email address above, then click Forgot password.");
      return;
    }

    setResetLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    setResetSent(true);
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
            Welcome back
          </h1>
          <p className="font-body text-sm text-text-secondary">
            Log in to see your watchlist and briefings.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
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
              className="w-full px-4 py-3 bg-white border border-field rounded-lg font-body text-base sm:text-sm text-text-primary placeholder:text-text-secondary hover:border-text-primary focus:border-text-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {/* The row is 44px tall so "Forgot password?" gets a full tap
                target; -mt-5 takes that height out of the gap above, so the
                fields stay where they were. */}
            <div className="flex items-end justify-between -mt-5">
              <label
                htmlFor="password"
                className="font-body text-sm font-medium text-text-primary"
              >
                Password
              </label>
              <Button
                kind="text"
                size="sm"
                muted
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="!items-end min-h-[44px]"
              >
                {resetLoading ? "Sending…" : "Forgot password?"}
              </Button>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-field rounded-lg font-body text-base sm:text-sm text-text-primary placeholder:text-text-secondary hover:border-text-primary focus:border-text-primary transition-colors"
            />
          </div>

          {error && (
            <p className="font-body text-sm text-urgent-ink bg-[#FDF2F2] border border-[#FAD4D4] rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {resetSent && (
            <p className="font-body text-sm text-positive-ink bg-[#F2FBF7] border border-[#C3E8D7] rounded-lg px-4 py-3">
              Password reset email sent. Check your inbox.
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-1">
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="font-body text-sm text-text-secondary text-center mt-8 pt-6 border-t border-border">
          Don&apos;t have an account?{" "}
          <Button href="/signup" kind="text">
            Get started free
          </Button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <CanaryLogoIcon size={32} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
