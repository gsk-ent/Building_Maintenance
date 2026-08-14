"use client";

import { useActionState } from "react";
import { grantGlobalRole } from "@/lib/actions/users";
import type { ActionState } from "@/lib/actions/properties";
import { ROLE_LABELS } from "@/lib/permissions/core";
import type { AppRole } from "@/types/database";

const ALL_ROLES: AppRole[] = [
  "admin",
  "property_manager",
  "maintenance_manager",
  "technician",
  "resident",
  "vendor",
];

export function GrantRoleForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    grantGlobalRole,
    {},
  );
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue="property_manager"
        className="rounded-none border border-line px-2 py-1 text-xs"
        aria-label="Role to grant"
      >
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-none border border-line bg-white px-2 py-1 text-xs font-medium text-ink hover:bg-paper"
      >
        + Grant
      </button>
      {state.errors?._form && (
        <span className="text-xs text-bad">{state.errors._form}</span>
      )}
    </form>
  );
}
