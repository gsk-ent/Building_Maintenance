"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/permissions";
import { logActivity } from "@/lib/activity/log";
import { grantRoleSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/actions/properties";

export async function grantGlobalRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = grantRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { errors: { _form: "Invalid role." } };

  const current = await getCurrentUser();
  if (!current || !isAdmin(current)) {
    return {
      errors: { _form: "Only a platform admin can change platform roles." },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: parsed.data.userId, role: parsed.data.role });
  if (error) {
    return {
      errors: {
        _form: "Could not grant that role (they may already have it).",
      },
    };
  }

  await logActivity({
    userId: current.id,
    action: "role.granted",
    entityType: "user_role",
    entityId: parsed.data.userId,
    metadata: { role: parsed.data.role },
  });

  revalidatePath("/admin/users");
  return { success: true, message: "Role granted." };
}

export async function revokeGlobalRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = grantRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { errors: { _form: "Invalid role." } };

  const current = await getCurrentUser();
  if (!current || !isAdmin(current)) {
    return {
      errors: { _form: "Only a platform admin can change platform roles." },
    };
  }

  const supabase = await createClient();

  // Guard against removing the platform's last admin — without this,
  // revoking your own (or the only) admin role would lock everyone out of
  // platform administration with no way back in short of direct SQL.
  if (parsed.data.role === "admin") {
    const { count } = await supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return {
        errors: {
          _form:
            "Can't remove the last platform admin — grant admin to someone else first.",
        },
      };
    }
  }

  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", parsed.data.userId)
    .eq("role", parsed.data.role);
  if (error) return { errors: { _form: "Could not revoke that role." } };

  await logActivity({
    userId: current.id,
    action: "role.revoked",
    entityType: "user_role",
    entityId: parsed.data.userId,
    metadata: { role: parsed.data.role },
  });

  revalidatePath("/admin/users");
  return { success: true, message: "Role revoked." };
}
