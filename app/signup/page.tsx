"use client";

import { useState } from "react";
import Link from "next/link";
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
      setError(signupError.message);
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
        <div className="card w-full max-w-md p-10 flex flex-col items-center text-center gap-6">
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
          <Link href="/login" className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    );
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
              className="w-full px-4 py-3 bg-white border border-border rounded-lg font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-canary transition-colors"
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
              className="w-full px-4 py-3 bg-white border border-border rounded-lg font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-canary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirm-password"
              className="font-body text-sm font-medium text-text-primary"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-border rounded-lg font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-canary transition-colors"
            />
          </div>

          {error && (
            <p className="font-body text-sm text-urgent bg-[#FDF2F2] border border-[#FAD4D4] rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          >
            {loading ? "Creating account…" : "Get Started Free"}
          </button>
        </form>

        <p className="font-body text-sm text-text-secondary text-center mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-text-primary font-medium hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>

      <p className="font-body text-xs text-text-secondary mt-6 text-center max-w-sm">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
