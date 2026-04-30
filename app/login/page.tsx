"use client";

import { useState } from "react";
import Link from "next/link";
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
      <Link href="/" className="flex items-center gap-2 mb-8">
        <CanaryLogoIcon size={28} />
        <span className="font-display text-xl font-semibold text-text-primary">
          Canary
        </span>
      </Link>

      <div className="card w-full max-w-md p-10">
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
              className="w-full px-4 py-3 bg-white border border-border rounded-lg font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-canary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="font-body text-sm font-medium text-text-primary"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="font-body text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                {resetLoading ? "Sending…" : "Forgot password?"}
              </button>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-border rounded-lg font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-canary transition-colors"
            />
          </div>

          {error && (
            <p className="font-body text-sm text-urgent bg-[#FDF2F2] border border-[#FAD4D4] rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {resetSent && (
            <p className="font-body text-sm text-positive bg-[#F2FBF7] border border-[#C3E8D7] rounded-lg px-4 py-3">
              Password reset email sent. Check your inbox.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>

        <p className="font-body text-sm text-text-secondary text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-text-primary font-medium hover:underline"
          >
            Get started free
          </Link>
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
