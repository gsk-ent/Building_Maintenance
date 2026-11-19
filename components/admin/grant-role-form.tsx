"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { grantGlobalRole } from "@/lib/actions/users";
import type { ActionState } from "@/lib/actions/properties";
import { ROLE_LABELS } from "@/lib/permissions/core";
import type { AppRole } from "@/types/database";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

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
    {}
  );
  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Select
        label="Role to grant"
        name="role"
        defaultValue="property_manager"
        error={state.errors?.role}
      >
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="secondary" size="sm">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Grant
      </Button>
      {state.errors?._form && (
        <span className="text-xs text-bad">{state.errors._form}</span>
      )}
    </form>
  );
}
