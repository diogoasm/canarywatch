"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import { AppPage, Masthead, Section } from "@/components/AppPage";
import Button from "@/components/Button";

const MONTHLY_LIMIT = 2;

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Read through a ref so the effect below runs once, on open, and doesn't
  // re-focus Cancel every time the parent re-renders.
  const stateRef = useRef({ deleting, onCancel });
  stateRef.current = { deleting, onCancel };

  useEffect(() => {
    // Whatever opened the dialog gets focus back when it closes.
    const opener = document.activeElement as HTMLElement | null;
    // Cancel, not the destructive button, takes focus first.
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!stateRef.current.deleting) stateRef.current.onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      // Keep Tab inside the dialog while it's open.
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#1A1A1A]/60"
        onClick={deleting ? undefined : onCancel}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        className="relative card p-6 max-w-md w-full"
      >
        <h2
          id="delete-dialog-title"
          className="font-display text-lg font-bold text-text-primary mb-3"
        >
          Are you sure?
        </h2>
        <p
          id="delete-dialog-description"
          className="font-body text-sm text-text-primary leading-relaxed mb-5"
        >
          This will permanently delete your account, watchlist and all
          briefings. This cannot be undone.
        </p>
        {error && (
          <p
            role="alert"
            className="font-body text-sm text-urgent-ink bg-[#FDF2F2] border border-[#FAD4D4] rounded-lg px-3 py-2 mb-4"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            ref={cancelRef}
            kind="secondary"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button tone="danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Yes, delete everything"}
          </Button>
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

  // Stripe portal state
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Post-checkout success banner (?upgraded=true), auto-dismissed after 5s.
  // Read from window.location instead of useSearchParams to avoid needing
  // a Suspense boundary at build time.
  const [showUpgradedBanner, setShowUpgradedBanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      setShowUpgradedBanner(true);
      const t = setTimeout(() => setShowUpgradedBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, []);

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

  async function handleManageSubscription() {
    setOpeningPortal(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setPortalError(json.error ?? "Failed to open subscription portal.");
        setOpeningPortal(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setPortalError("Network error. Please try again.");
      setOpeningPortal(false);
    }
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
    <AppPage>
      <Masthead label="Your account" title="Settings" />

      {showUpgradedBanner && (
        <p
          role="status"
          className="border-t border-border py-4 font-body text-sm font-medium text-positive-ink"
        >
          Welcome to Premium. Unlimited briefings are now active.
        </p>
      )}

      {loading ? (
        <div aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-t border-border py-10 sm:py-12 animate-pulse">
              <div className="h-3 bg-border w-24 mb-6" />
              <div className="h-4 bg-border/60 w-48 mb-4" />
              <div className="h-11 bg-border/60 w-40 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <Section label="Account">
            <dl className="mb-6">
              <dt className="font-body text-sm text-text-secondary mb-1">
                Email address
              </dt>
              <dd className="font-body text-base text-text-primary">
                {email ?? "—"}
              </dd>
            </dl>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button
                kind="secondary"
                onClick={handlePasswordReset}
                disabled={sendingReset || !email}
              >
                {sendingReset ? "Sending…" : "Change password"}
              </Button>
              {resetStatus && (
                <p
                  role="status"
                  className={`font-body text-sm ${
                    resetStatus.type === "success"
                      ? "text-positive-ink"
                      : "text-urgent-ink"
                  }`}
                >
                  {resetStatus.message}
                </p>
              )}
            </div>
          </Section>

          <Section label="Subscription">
            <dl className="mb-6">
              <dt className="font-body text-sm text-text-secondary mb-1">Plan</dt>
              <dd className="font-body text-base text-text-primary">
                {isPremium ? (
                  <>
                    Premium{" "}
                    <span className="text-positive-ink">· Active, unlimited briefings</span>
                  </>
                ) : (
                  "Free"
                )}
              </dd>
            </dl>

            {isPremium ? (
              <>
                <Button
                  kind="secondary"
                  onClick={handleManageSubscription}
                  disabled={openingPortal}
                >
                  {openingPortal ? "Opening portal…" : "Manage subscription"}
                </Button>
                {portalError && (
                  <p role="alert" className="font-body text-sm text-urgent-ink mt-3">
                    {portalError}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-body text-sm text-text-primary mb-3">
                  <span className="font-mono tabular-nums">{briefingsUsed}</span> of{" "}
                  <span className="font-mono tabular-nums">{MONTHLY_LIMIT}</span>{" "}
                  briefings used this month
                </p>
                <div
                  role="progressbar"
                  aria-label="Briefings used this month"
                  aria-valuemin={0}
                  aria-valuemax={MONTHLY_LIMIT}
                  aria-valuenow={briefingsUsed}
                  className="w-full max-w-sm h-px bg-border mb-8"
                >
                  <div
                    className="h-[3px] -mt-px bg-canary"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <Button href="/pricing">Upgrade to Premium</Button>
              </>
            )}
          </Section>

          <Section label="Delete account" labelClassName="text-urgent-ink">
            <p className="font-body text-sm text-text-secondary leading-relaxed mb-6 max-w-prose">
              Permanently removes your account, watchlist and every briefing.
            </p>
            <Button
              kind="secondary"
              tone="danger"
              onClick={() => {
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
            >
              Delete account
            </Button>
          </Section>
        </>
      )}

      {showDeleteModal && (
        <DeleteModal
          deleting={deleting}
          error={deleteError}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </AppPage>
  );
}
