"use client";

import { useActionState } from "react";
import { createUnit } from "@/lib/actions/properties";
import type { ActionState } from "@/lib/actions/properties";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/components/ui/form";

export function UnitForm({ buildingId }: { buildingId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createUnit, {});
  return (
    <form action={action} className="space-y-2" noValidate>
      <input type="hidden" name="buildingId" value={buildingId} />
      <FormError message={state.errors?._form} />
      <FormSuccess message={state.success ? state.message : undefined} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field
          label="Unit #"
          name="unitNumber"
          error={state.errors?.unitNumber}
        />
        <Field
          label="Floor"
          name="floor"
          type="number"
          required={false}
          error={state.errors?.floor}
        />
        <Field
          label="Monthly due (₹)"
          name="defaultMonthlyAmount"
          type="number"
          required={false}
          error={state.errors?.defaultMonthlyAmount}
        />
      </div>
      <SubmitButton variant="secondary">Add unit</SubmitButton>
    </form>
  );
}
