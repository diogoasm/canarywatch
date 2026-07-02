import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Deleting an auth user requires the service-role key, so this must run
// server-side. All user data (profiles, watchlist, briefings) is removed
// automatically via ON DELETE CASCADE foreign keys.
export async function POST() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Account deletion is not configured on this server." },
      { status: 503 }
    );
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account/delete] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: 500 }
    );
  }

  // Clear the session cookies for this browser
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
