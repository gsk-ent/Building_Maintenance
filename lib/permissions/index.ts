import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/permissions/core";

export * from "@/lib/permissions/core";

/**
 * Centralized authorization context, memoized per request.
 * NOTE: UI checks are convenience only — the database enforces access via RLS.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: roleRows }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("*").eq("user_id", user.id),
      supabase
        .from("property_user_assignments")
        .select("relationship")
        .eq("user_id", user.id),
    ]);

  const relationships = (assignments ?? []).map((a) => a.relationship);

  return {
    id: user.id,
    email: user.email ?? "",
    profile: profile ?? null,
    roles: (roleRows ?? []).map((r) => r.role),
    isAssigned: relationships.length > 0,
    managesAnyProperty: relationships.some(
      (r) => r === "manager" || r === "admin",
    ),
    isAdminOfAnyProperty: relationships.some((r) => r === "admin"),
  };
});
