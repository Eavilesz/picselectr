import { createClient } from "@supabase/supabase-js";

// Service role client — NEVER import this in client components.
// It bypasses RLS and should only be used in Server Actions / Route Handlers
// for operations that need to work without an authenticated session
// (e.g. reading an event by slug for the public /select page).
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
