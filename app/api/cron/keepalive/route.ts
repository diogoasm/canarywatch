import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Hit by the daily Vercel cron (vercel.json) so the Supabase free-tier project
// never sits idle long enough to be paused. Must be dynamic: a statically
// prerendered response would be served from cache and never touch Supabase.
export const dynamic = "force-dynamic";

function failure(message: string, timestamp: string, status = 500) {
  console.error("[cron/keepalive] Supabase query failed:", message);
  return NextResponse.json({ ok: false, error: message, timestamp }, { status });
}

export async function GET() {
  const timestamp = new Date().toISOString();

  // The anon role has no table grants, so the query runs as service role.
  // Only `ok` and the timestamp are returned — no data leaves this route.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return failure("SUPABASE_SERVICE_ROLE_KEY is not set", timestamp, 503);
  }

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) return failure(error.message, timestamp);

    return NextResponse.json({ ok: true, timestamp });
  } catch (err) {
    return failure(err instanceof Error ? err.message : String(err), timestamp);
  }
}
