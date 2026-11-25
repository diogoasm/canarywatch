"use client";

import { useEffect, useId, useRef, useState } from "react";
import CanaryIcon from "@/components/CanaryIcon";
import { CANARY_MEANING } from "@/lib/canary";
import type { CanaryStatus } from "@/types";

// Gap between the icon and the note, plus a little room at the page edge.
const NOTE_MARGIN = 20;

/**
 * A canary that explains itself. The icon is a button: click, tap, Enter or
 * Space opens the reason beside it, and Escape, a second press or a press
 * anywhere else closes it. Hovering with a mouse previews it too. The note is
 * a live region, so a screen reader reads it out when it opens.
 */
export function CanaryToggletip({
  ticker,
  status,
  reason,
  size = 20,
}: {
  ticker: string;
  status: CanaryStatus;
  reason: string;
  size?: number;
}) {
  const noteId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [placement, setPlacement] = useState({
    flip: false,
    maxWidth: undefined as number | undefined,
  });

  // A canary can sit anywhere on the page, so the note opens towards
  // whichever side has room instead of running off the edge.
  function place() {
    const el = wrapRef.current;
    if (!el) return;
    const icon = el.getBoundingClientRect();
    const page =
      el.closest("main")?.getBoundingClientRect() ??
      document.documentElement.getBoundingClientRect();
    const roomLeft = icon.left - page.left;
    const roomRight = page.right - icon.right;
    setPlacement({
      flip: roomLeft > roomRight,
      maxWidth: Math.max(roomLeft, roomRight) - NOTE_MARGIN,
    });
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const visible = open || hover;

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex items-center"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        place();
        setHover(true);
      }}
      onPointerLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={noteId}
        aria-label={`${ticker}: ${CANARY_MEANING[status].label}`}
        onClick={() => {
          place();
          setOpen((o) => !o);
        }}
        className="tap inline-flex items-center justify-center rounded-full"
      >
        <CanaryIcon status={status} size={size} />
      </button>
      <span
        className={`absolute top-1/2 -translate-y-1/2 z-20 ${
          placement.flip ? "right-full mr-3" : "left-full ml-3"
        }`}
      >
        {/* Always rendered so the live region exists before it changes. */}
        <span id={noteId} role="status" aria-live="polite">
          {visible && (
            <span
              className="relative block w-max bg-[#1A1A1A] text-white font-body text-xs rounded-md px-3 py-1.5 shadow-xl"
              style={{ maxWidth: placement.maxWidth }}
            >
              <span
                aria-hidden="true"
                className={`absolute top-1/2 -translate-y-1/2 border-4 border-transparent ${
                  placement.flip
                    ? "left-full border-l-[#1A1A1A]"
                    : "right-full border-r-[#1A1A1A]"
                }`}
              />
              {/* Read out only when opened on purpose, not on mouse hover. */}
              <span aria-hidden={!open}>{reason}</span>
            </span>
          )}
        </span>
      </span>
    </span>
  );
}

export default function CanaryStrip({
  holdings,
}: {
  holdings: {
    id: string;
    ticker: string;
    status: CanaryStatus;
    reason: string;
  }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-6">
      {holdings.map((holding) => (
        <li
          key={holding.id}
          className="flex flex-col items-center gap-2 min-w-[3rem]"
        >
          <CanaryToggletip
            ticker={holding.ticker}
            status={holding.status}
            reason={holding.reason}
            size={28}
          />
          <span aria-hidden="true" className="font-mono text-[11px] text-text-primary">
            {holding.ticker}
          </span>
        </li>
      ))}
    </ul>
  );
}
