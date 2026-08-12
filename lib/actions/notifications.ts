"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation";

export async function markNotificationRead(formData: FormData): Promise<void> {
  const id = uuidSchema.safeParse(formData.get("notificationId"));
  if (!id.success) return;
  const supabase = await createClient();
  // RLS restricts to the user's own notifications.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id.data);
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .eq("user_id", user.id);
  revalidatePath("/notifications");
}
