"use client";

import { useId, useState } from "react";
import Button from "@/components/Button";
import CanaryIcon from "@/components/CanaryIcon";
import { CANARY_MEANING, CANARY_ORDER } from "@/lib/canary";

/** The four colours and what triggers them, for the homepage. */
export default function CanaryKey() {
  return (
    <ul className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 sm:gap-x-8 gap-y-8">
      {CANARY_ORDER.map((status) => {
        const { label, rule } = CANARY_MEANING[status];
        return (
          <li key={status} className="flex items-start gap-3">
            <span aria-hidden="true" className="shrink-0 -mt-0.5">
              <CanaryIcon status={status} size={22} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-xs leading-5 text-text-primary">
                {label}
              </p>
              {rule && (
                <p className="mt-1 font-body text-sm text-text-secondary leading-snug">
                  {rule}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The same key on one line, closed until asked for, for the watchlist. */
export function CanaryKeyToggle() {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button
        kind="text"
        size="sm"
        muted
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        What do the colours mean?
      </Button>
      <ul
        id={id}
        hidden={!open}
        className={`mt-3 flex-wrap gap-x-4 gap-y-2 font-body text-xs text-text-secondary ${
          open ? "flex" : ""
        }`}
      >
        {CANARY_ORDER.map((status) => {
          const { label, shortRule } = CANARY_MEANING[status];
          return (
            <li key={status} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-flex shrink-0">
                <CanaryIcon status={status} size={14} />
              </span>
              <span>
                <span className="text-text-primary">{label}</span>
                {shortRule && `: ${shortRule}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
