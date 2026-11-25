import { createClient } from "@supabase/supabase-js";
import type { Mover, MoverListKey } from "@/lib/movers";

// The best movers lists of the session, kept in Supabase so there's something
// to show once the market closes. One row per list. Every failure here (no
// key, no table, Supabase paused) means "no snapshot": the table still works.

export interface MoversSnapshot {
  list: MoverListKey;
  session_date: string;
  taken_at: string;
  movers: Mover[];
}

const TABLE = "market_snapshots";
const TIMEOUT_MS = 3000;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The anon role has no table grants, and nobody signed in should write here.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      // Next caches fetches by default, which would freeze the snapshot.
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }),
    },
  });
}

/** Null when snapshots can't be read at all. */
export async function readSnapshots(): Promise<MoversSnapshot[] | null> {
  const supabase = adminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("list, session_date, taken_at, movers");
  if (error) {
    console.error("[movers] couldn't read snapshots:", error.message);
    return null;
  }
  return data as MoversSnapshot[];
}

export async function saveSnapshots(rows: MoversSnapshot[]): Promise<void> {
  const supabase = adminClient();
  if (!supabase || rows.length === 0) return;

  const { error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: "list" });
  if (error) console.error("[movers] couldn't save snapshots:", error.message);
}
