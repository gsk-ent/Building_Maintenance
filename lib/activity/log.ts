import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeMetadata } from "@/lib/activity/sanitize";

export interface LogActivityInput {
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  /** Set true only for events where losing the log is unacceptable. */
  critical?: boolean;
}

/**
 * Server-side activity logger. Writes via the admin client so that
 * (a) users cannot forge or suppress logs from the browser, and
 * (b) the user_activity table stays INSERT-denied for normal users.
 *
 * Non-critical logging failures never break the primary operation.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const hdrs = await headers().catch(() => null);
    const ip = hdrs?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = hdrs?.get("user-agent") ?? null;

    const supabase = createAdminClient();
    const { error } = await supabase.from("user_activity").insert({
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      description: input.description ?? null,
      metadata: sanitizeMetadata(input.metadata),
      ip_address: ip,
      user_agent: userAgent,
    });
    if (error) throw error;
  } catch (err) {
    if (input.critical) throw err;
    console.error("[activity] failed to log", input.action, err);
  }
}
