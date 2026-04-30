// Re-exports for convenience — prefer the SSR-aware clients in lib/supabase/
export { createClient as createBrowserClient } from "./supabase/client";
export { createClient as createServerClient } from "./supabase/server";

