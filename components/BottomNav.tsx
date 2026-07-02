"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/watchlist",
    label: "Watchlist",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="4.5" width="16" height="2.5" rx="1.25" fill={active ? "#1A1A1A" : "#9CA3AF"} />
        <rect x="3" y="9.75" width="16" height="2.5" rx="1.25" fill={active ? "#1A1A1A" : "#9CA3AF"} />
        <rect x="3" y="15" width="10" height="2.5" rx="1.25" fill={active ? "#1A1A1A" : "#9CA3AF"} />
      </svg>
    ),
  },
  {
    href: "/advisor",
    label: "Advisor",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
          d="M11 2L13.5 9H20.5L14.8 13.2L17.3 20L11 15.8L4.7 20L7.2 13.2L1.5 9H8.5L11 2Z"
          fill={active ? "#1A1A1A" : "none"}
          stroke={active ? "#1A1A1A" : "#9CA3AF"}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/valuation",
    label: "Valuation",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect
          x="2.5"
          y="2.5"
          width="17"
          height="17"
          rx="2.5"
          stroke={active ? "#1A1A1A" : "#9CA3AF"}
          strokeWidth="1.4"
        />
        <path
          d="M6 13.5l3-3 2.5 2.5 4.5-5"
          stroke={active ? "#1A1A1A" : "#9CA3AF"}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 17h10"
          stroke={active ? "#1A1A1A" : "#9CA3AF"}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/learn",
    label: "Learn",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
          d="M11 4.5C9.3 3.1 7 2.5 4 2.5v14.5c3 0 5.3.6 7 2 1.7-1.4 4-2 7-2V2.5c-3 0-5.3.6-7 2z"
          stroke={active ? "#1A1A1A" : "#9CA3AF"}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M11 4.5V19"
          stroke={active ? "#1A1A1A" : "#9CA3AF"}
          strokeWidth="1.4"
        />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle
          cx="11"
          cy="11"
          r="3"
          stroke={active ? "#1A1A1A" : "#9CA3AF"}
          strokeWidth="1.4"
        />
        <path
          d="M11 2v2.5M11 17.5V20M2 11h2.5M17.5 11H20M4.5 4.5l1.8 1.8M15.7 15.7l1.8 1.8M4.5 17.5l1.8-1.8M15.7 6.3l1.8-1.8"
          stroke={active ? "#1A1A1A" : "#9CA3AF"}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-1 px-3 py-2"
            >
              {link.icon(active)}
              <span
                className={`font-body text-xs ${
                  active
                    ? "text-text-primary font-semibold"
                    : "text-text-secondary"
                }`}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
