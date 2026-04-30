"use client";

import type { CanaryStatus } from "@/types";
import { getCanaryColor, getCanaryLabel } from "@/lib/utils";

interface CanaryIconProps {
  status?: CanaryStatus;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

const statusColors: Record<CanaryStatus, string> = {
  red: "#E03B3B",
  yellow: "#F5C842",
  green: "#2D9E6B",
  grey: "#C4C0B8",
};

export default function CanaryIcon({
  status = "grey",
  size = 20,
  showLabel = false,
  className = "",
}: CanaryIconProps) {
  const color = statusColors[status];
  const label = getCanaryLabel(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={label}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`${label} canary`}
      >
        {/* Body */}
        <ellipse cx="12" cy="13" rx="6" ry="5" fill={color} />
        {/* Head */}
        <circle cx="15.5" cy="8.5" r="3.5" fill={color} />
        {/* Wing detail */}
        <ellipse cx="9" cy="13" rx="3.5" ry="2.5" fill={color} opacity="0.7" />
        {/* Beak */}
        <polygon points="18.5,8 21,9 18.5,10" fill="#1A1A1A" opacity="0.4" />
        {/* Eye */}
        <circle cx="16.5" cy="7.8" r="0.8" fill="#1A1A1A" opacity="0.6" />
        {/* Tail */}
        <path
          d="M6 15 Q4 17 3 20 Q5 18 7 17"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
        {/* Legs */}
        <line
          x1="11"
          y1="18"
          x2="10"
          y2="21"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <line
          x1="13"
          y1="18"
          x2="14"
          y2="21"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
      {showLabel && (
        <span
          className="text-xs font-body font-medium"
          style={{ color }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

export function CanaryLogoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="12" cy="13" rx="6" ry="5" fill="#F5C842" />
      <circle cx="15.5" cy="8.5" r="3.5" fill="#F5C842" />
      <ellipse cx="9" cy="13" rx="3.5" ry="2.5" fill="#F5C842" opacity="0.7" />
      <polygon points="18.5,8 21,9 18.5,10" fill="#1A1A1A" opacity="0.5" />
      <circle cx="16.5" cy="7.8" r="0.8" fill="#1A1A1A" opacity="0.7" />
      <path
        d="M6 15 Q4 17 3 20 Q5 18 7 17"
        stroke="#F5C842"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="11" y1="18" x2="10" y2="21" stroke="#D4A800" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="18" x2="14" y2="21" stroke="#D4A800" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
