"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CanaryLogoIcon } from "./CanaryIcon";

interface NavLink {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const navLinks: NavLink[] = [
  {
    href: "/watchlist",
    label: "Watchlist",
    icon: (active) => (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <rect x="1.5" y="2.5" width="14" height="2" rx="1" fill={active ? "#1A1A1A" : "#6B6B6B"} />
        <rect x="1.5" y="7.5" width="14" height="2" rx="1" fill={active ? "#1A1A1A" : "#6B6B6B"} />
        <rect x="1.5" y="12.5" width="9" height="2" rx="1" fill={active ? "#1A1A1A" : "#6B6B6B"} />
      </svg>
    ),
  },
  {
    href: "/advisor",
    label: "AI Advisor",
    icon: (active) => (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <path
          d="M8.5 1.5L10.3 6.5H15.5L11.3 9.5L13.1 14.5L8.5 11.5L3.9 14.5L5.7 9.5L1.5 6.5H6.7L8.5 1.5Z"
          fill={active ? "#1A1A1A" : "none"}
          stroke={active ? "#1A1A1A" : "#6B6B6B"}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (active) => (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <circle
          cx="8.5"
          cy="8.5"
          r="2.5"
          stroke={active ? "#1A1A1A" : "#6B6B6B"}
          strokeWidth="1.3"
        />
        <path
          d="M8.5 1v2M8.5 14v2M1 8.5h2M14 8.5h2M3.1 3.1l1.4 1.4M12.5 12.5l1.4 1.4M3.1 13.9l1.4-1.4M12.5 4.5l1.4-1.4"
          stroke={active ? "#1A1A1A" : "#6B6B6B"}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[#F0EDE6] border-r border-border min-h-screen sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2 group">
          <CanaryLogoIcon size={24} />
          <span className="font-display text-lg font-semibold text-text-primary">
            Canary
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navLinks.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                active
                  ? "bg-white shadow-card text-text-primary font-medium"
                  : "text-text-secondary hover:bg-white/70 hover:text-text-primary"
              }`}
            >
              {link.icon(active)}
              <span className="font-body text-sm">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-border">
        {email && (
          <p
            className="font-body text-xs text-text-secondary truncate mb-3"
            title={email}
          >
            {email}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-sm text-text-secondary hover:text-urgent hover:bg-[#FDF2F2] transition-colors duration-150"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M5.5 13H3a1 1 0 01-1-1V3a1 1 0 011-1h2.5M9.5 10.5L13 7.5l-3.5-3M13 7.5H5.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Log out
        </button>
      </div>
    </aside>
  );
}
