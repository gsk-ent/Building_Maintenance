"use client";

import { useActionState } from "react";
import { addPropertyMember } from "@/lib/actions/properties";
import type { ActionState } from "@/lib/actions/properties";
import { Field, FormError, FormSuccess, Select, SubmitButton } from "@/components/ui/form";

export function MemberForm({
  propertyId,
  units,
  canGrantAdmin,
}: {
  propertyId: string;
  units: { id: string; label: string }[];
  /** Only an existing building admin (or platform admin) may grant admin access. */
  canGrantAdmin: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(addPropertyMember, {});
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />
      <FormError message={state.errors?._form} />
      <FormSuccess message={state.success ? state.message : undefined} />
      <Field label="Member's email" name="email" type="email" error={state.errors?.email} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label="Role" name="relationship" defaultValue="resident" error={state.errors?.relationship}>
          <option value="resident">Resident</option>
          <option value="manager">Manager</option>
          {canGrantAdmin && <option value="admin">Admin (this building)</option>}
          <option value="technician">Technician</option>
          <option value="vendor">Vendor</option>
        </Select>
        <Select label="Unit (residents)" name="unitId" required={false} defaultValue="" error={state.errors?.unitId}>
          <option value="">No specific unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-xs text-slate-500">
        They must already have an account (signed up or created in Supabase Auth) —
        this links their existing account to the property.
        {canGrantAdmin
          ? " As a building admin, you can also grant admin access to another member."
          : " Only a building admin can grant admin access."}
      </p>
      <SubmitButton variant="secondary">Add member</SubmitButton>
    </form>
  );
}
