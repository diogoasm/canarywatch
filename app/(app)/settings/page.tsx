"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

const MONTHLY_LIMIT = 2;

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-xs uppercase tracking-widest mb-4 ${className}`}
    >
      {children}
    </p>
  );
}

// ─── Delete confirmation modal ─────────────────────────────────────────────

function DeleteModal({
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-[#1A1A1A]/60"
        onClick={deleting ? undefined : onCancel}
      />
      <div className="relative card p-6 max-w-md w-full">
        <h3 className="font-display text-lg font-bold text-text-primary mb-3">
          Are you sure?
        </h3>
        <p className="font-body text-sm text-text-primary leading-relaxed mb-5">
          This will permanently delete your account, watchlist and all
          briefings. This cannot be undone.
        </p>
        {error && (
          <p className="font-body text-sm text-urgent bg-[#FDF2F2] border border-[#FAD4D4] rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="font-body text-sm font-semibold text-text-primary border border-border rounded-lg px-5 py-2.5 hover:border-text-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="bg-urgent text-white font-body text-sm font-semibold rounded-lg px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Yes, delete everything"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Change password state
  const [resetStatus, setResetStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [sendingReset, setSendingReset] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setEmail(user.email ?? null);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as Profile);
      setLoading(false);
    }
    load();
  }, []);

  async function handlePasswordReset() {
    if (!email) return;
    setSendingReset(true);
    setResetStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setResetStatus({ type: "error", message: error.message });
    } else {
      setResetStatus({ type: "success", message: "Password reset email sent" });
    }
    setSendingReset(false);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error ?? "Failed to delete account.");
        setDeleting(false);
        return;
      }
      // Clear local session and go home
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setDeleteError("Network error. Please try again.");
      setDeleting(false);
    }
  }

  const isPremium = profile?.plan === "premium";
  const briefingsUsed = Math.min(profile?.briefings_used ?? 0, MONTHLY_LIMIT);
  const usagePct = (briefingsUsed / MONTHLY_LIMIT) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold text-text-primary mb-8">
        Settings
      </h1>

      {loading ? (
        <div className="flex flex-col gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-3 bg-border rounded w-24 mb-4" />
              <div className="h-4 bg-background rounded w-48 mb-3" />
              <div className="h-9 bg-background rounded w-36" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* ── Section 1: Account ── */}
          <div className="card p-6">
            <SectionLabel className="text-text-secondary">
              Account
            </SectionLabel>
            <div className="mb-5">
              <p className="font-body text-xs text-text-secondary uppercase tracking-wide mb-1">
                Email address
              </p>
              <p className="font-body text-sm text-text-primary">
                {email ?? "—"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handlePasswordReset}
                disabled={sendingReset || !email}
                className="font-body text-sm font-semibold text-text-primary border border-border rounded-lg px-4 py-2.5 hover:border-text-secondary transition-colors disabled:opacity-50"
              >
                {sendingReset ? "Sending…" : "Change Password"}
              </button>
              {resetStatus && (
                <p
                  className={`font-body text-sm ${
                    resetStatus.type === "success"
                      ? "text-positive"
                      : "text-urgent"
                  }`}
                >
                  {resetStatus.message}
                </p>
              )}
            </div>
          </div>

          {/* ── Section 2: Subscription ── */}
          <div className="card p-6">
            <SectionLabel className="text-text-secondary">
              Subscription
            </SectionLabel>

            <div className="flex items-center gap-3 mb-5">
              {isPremium ? (
                <>
                  <span className="inline-flex items-center font-body text-xs font-bold bg-canary text-[#1A1A1A] px-3 py-1.5 rounded-full">
                    Premium
                  </span>
                  <span className="inline-flex items-center font-body text-xs font-semibold text-positive bg-positive/10 px-3 py-1.5 rounded-full">
                    Active subscription
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center font-body text-xs font-semibold bg-background border border-border text-text-secondary px-3 py-1.5 rounded-full">
                  Free Plan
                </span>
              )}
            </div>

            {isPremium ? (
              <p className="font-body text-sm text-positive font-medium">
                Unlimited briefings
              </p>
            ) : (
              <>
                <p className="font-body text-sm text-text-primary mb-2">
                  {briefingsUsed} of {MONTHLY_LIMIT} briefings used this month
                </p>
                <div className="w-full h-1 bg-border/70 rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-canary rounded-full transition-all duration-500"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <Link
                  href="/pricing"
                  className="inline-block bg-canary text-[#1A1A1A] font-body text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-canary-dark transition-colors"
                >
                  Upgrade to Premium
                </Link>
              </>
            )}
          </div>

          {/* ── Section 3: Danger Zone ── */}
          <div className="card p-6">
            <SectionLabel className="text-urgent">Danger Zone</SectionLabel>
            <button
              onClick={() => {
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              className="font-body text-sm font-semibold text-urgent border border-urgent rounded-lg px-4 py-2.5 hover:bg-[#FDF2F2] transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <DeleteModal
          deleting={deleting}
          error={deleteError}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
}
