"use client";

import { useActionState } from "react";
import { addPropertyMember } from "@/lib/actions/properties";
import type { ActionState } from "@/lib/actions/properties";
import { Field, FormError, FormSuccess, Select, SubmitButton } from "@/components/ui/form";

export function MemberForm({
  propertyId,
  units,
}: {
  propertyId: string;
  units: { id: string; label: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(addPropertyMember, {});
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />
      <FormError message={state.errors?._form} />
      <FormSuccess message={state.success ? state.message : undefined} />
      <Field label="Member's email" name="email" type="email" error={state.errors?.email} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Role" name="relationship" defaultValue="resident" error={state.errors?.relationship}>
          <option value="resident">Resident</option>
          <option value="manager">Manager</option>
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
      </p>
      <SubmitButton variant="secondary">Add member</SubmitButton>
    </form>
  );
}
