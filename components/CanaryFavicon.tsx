"use client";

import { useEffect, useState } from "react";
import { fetchQuote } from "@/lib/quotes";
import { createClient } from "@/lib/supabase/client";
import { resolveHoldingCanary } from "@/lib/utils";
import type { CanaryStatus } from "@/types";

// Fired by the watchlist page when a holding is added or removed.
export const WATCHLIST_CHANGED = "canary:watchlist-changed";

const ICONS = { red: "/icon-red.svg", yellow: "/icon-yellow.svg" };
const TITLE_PREFIX = "● ";

type Alert = keyof typeof ICONS;

function tabIcons() {
  return document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
}

function mostUrgent(statuses: CanaryStatus[]): Alert | null {
  if (statuses.includes("red")) return "red";
  if (statuses.includes("yellow")) return "yellow";
  return null;
}

// Shows the most urgent holding in the browser tab, on every logged-in page.
export default function CanaryFavicon() {
  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => {
    let latest = 0;

    async function check() {
      const run = ++latest;
      const { data } = await createClient()
        .from("watchlist")
        .select("ticker, shares, avg_buy_price");

      const statuses = await Promise.all(
        (data ?? []).map(async (holding) => {
          try {
            const quote = await fetchQuote<{
              price?: number;
              next_earnings_date?: string | null;
            }>(holding.ticker);
            return resolveHoldingCanary(holding, quote).status;
          } catch {
            return "grey" as const;
          }
        })
      );

      if (run === latest) setAlert(mostUrgent(statuses));
    }

    check();
    window.addEventListener(WATCHLIST_CHANGED, check);
    return () => {
      latest++;
      window.removeEventListener(WATCHLIST_CHANGED, check);
    };
  }, []);

  useEffect(() => {
    if (!alert) return;
    const alertHref = ICONS[alert];
    const defaultHref = tabIcons()[0]?.getAttribute("href");

    function apply() {
      tabIcons().forEach((link) => {
        if (link.getAttribute("href") !== alertHref) {
          link.setAttribute("href", alertHref);
        }
      });
      if (alert === "red" && !document.title.startsWith(TITLE_PREFIX)) {
        document.title = TITLE_PREFIX + document.title;
      }
    }

    apply();

    // Next rebuilds these tags on navigation, a moment after the route changes.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (defaultHref) {
        tabIcons().forEach((link) => link.setAttribute("href", defaultHref));
      }
      // Only the prefix comes off: the next page may already have set its title.
      if (document.title.startsWith(TITLE_PREFIX)) {
        document.title = document.title.slice(TITLE_PREFIX.length);
      }
    };
  }, [alert]);

  return null;
}
