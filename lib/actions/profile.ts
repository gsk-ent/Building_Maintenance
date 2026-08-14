"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { fieldErrors, profileSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/actions/properties";

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    })
    .eq("user_id", user.id);

  if (error) return { errors: { _form: "Could not update your profile." } };

  await logActivity({
    userId: user.id,
    action: "profile.updated",
    entityType: "profile",
    entityId: user.id,
    metadata: { fields: ["full_name", "phone"] },
  });

  revalidatePath("/profile");
  return { success: true, message: "Profile updated." };
}
