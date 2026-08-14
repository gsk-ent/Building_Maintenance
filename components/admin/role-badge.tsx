"use client";

import { useActionState } from "react";
import { revokeGlobalRole } from "@/lib/actions/users";
import type { ActionState } from "@/lib/actions/properties";
import { ROLE_LABELS } from "@/lib/permissions/core";
import type { AppRole } from "@/types/database";

export function RoleBadge({ userId, role }: { userId: string; role: AppRole }) {
  const [state, action] = useActionState<ActionState, FormData>(
    revokeGlobalRole,
    {}
  );
  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={role} />
      <span
        className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
          role === "admin"
            ? "bg-teal-deep/10 text-teal-deep"
            : "bg-paper-2 text-ink"
        }`}
      >
        {ROLE_LABELS[role]}
      </span>
      <button
        type="submit"
        aria-label={`Revoke ${ROLE_LABELS[role]}`}
        title={`Revoke ${ROLE_LABELS[role]}`}
        className="text-xs text-muted hover:text-bad"
      >
        ✕
      </button>
      {state.errors?._form && (
        <span className="text-xs text-bad">{state.errors._form}</span>
      )}
    </form>
  );
}
