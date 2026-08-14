import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Privileged server-only client using the secret (service-role) key.
 * BYPASSES RLS. Use only where strictly necessary (e.g. writing activity
 * logs on behalf of the system). The "server-only" import guarantees this
 * module can never be bundled into client code.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SECRET_KEY is not configured");
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
