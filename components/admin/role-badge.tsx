"use client";

import { useActionState } from "react";
import { X } from "lucide-react";
import { revokeGlobalRole } from "@/lib/actions/users";
import type { ActionState } from "@/lib/actions/properties";
import { ROLE_LABELS } from "@/lib/permissions/core";
import type { AppRole } from "@/types/database";
import { Badge } from "@/components/ui/badge";

export function RoleBadge({ userId, role }: { userId: string; role: AppRole }) {
  const [state, action] = useActionState<ActionState, FormData>(
    revokeGlobalRole,
    {}
  );
  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={role} />
      <Badge tone={role === "admin" ? "teal" : "neutral"}>
        {ROLE_LABELS[role]}
      </Badge>
      <button
        type="submit"
        aria-label={`Revoke ${ROLE_LABELS[role]}`}
        title={`Revoke ${ROLE_LABELS[role]}`}
        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-bad focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      {state.errors?._form && (
        <span className="text-xs text-bad">{state.errors._form}</span>
      )}
    </form>
  );
}
