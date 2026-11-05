"use client";

import { useState } from "react";
import CanaryIcon from "@/components/CanaryIcon";
import type { CanaryStatus } from "@/types";

// Gap between the icon and the tooltip, plus a little room at the page edge.
const TOOLTIP_MARGIN = 20;

export function CanaryWithTooltip({
  status,
  tooltip,
  size = 20,
}: {
  status: CanaryStatus;
  tooltip: string;
  size?: number;
}) {
  const [placement, setPlacement] = useState({
    flip: false,
    maxWidth: undefined as number | undefined,
  });

  // A canary can sit anywhere in the strip, so the tooltip opens towards
  // whichever side has room instead of running off the edge of the page.
  function place(event: React.MouseEvent<HTMLDivElement>) {
    const icon = event.currentTarget.getBoundingClientRect();
    const page = event.currentTarget.closest("main")?.getBoundingClientRect();
    if (!page) return;
    const roomLeft = icon.left - page.left;
    const roomRight = page.right - icon.right;
    setPlacement({
      flip: roomLeft > roomRight,
      maxWidth: Math.max(roomLeft, roomRight) - TOOLTIP_MARGIN,
    });
  }

  return (
    <div
      className="relative group inline-flex items-center"
      onMouseEnter={place}
    >
      <CanaryIcon status={status} size={size} />
      <div
        className={`absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none ${
          placement.flip ? "right-full mr-3" : "left-full ml-3"
        }`}
      >
        <div
          className="hidden group-hover:block w-max bg-[#1A1A1A] text-white font-body text-xs rounded-md px-3 py-1.5 shadow-xl"
          style={{ maxWidth: placement.maxWidth }}
        >
          <div
            className={`absolute top-1/2 -translate-y-1/2 border-4 border-transparent ${
              placement.flip
                ? "left-full border-l-[#1A1A1A]"
                : "right-full border-r-[#1A1A1A]"
            }`}
          />
          {tooltip}
        </div>
      </div>
    </div>
  );
}

export default function CanaryStrip({
  holdings,
}: {
  holdings: {
    id: string;
    ticker: string;
    status: CanaryStatus;
    tooltip?: string;
  }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-6">
      {holdings.map((holding) => (
        <li
          key={holding.id}
          className="flex flex-col items-center gap-2 min-w-[3rem]"
        >
          {holding.tooltip ? (
            <CanaryWithTooltip
              status={holding.status}
              tooltip={holding.tooltip}
              size={28}
            />
          ) : (
            <CanaryIcon status={holding.status} size={28} />
          )}
          <span className="font-mono text-[11px] text-text-primary">
            {holding.ticker}
          </span>
        </li>
      ))}
    </ul>
  );
}
