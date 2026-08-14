"use client";

import { useActionState } from "react";
import { createBuilding, type ActionState } from "@/lib/actions/properties";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/components/ui/form";

export function BuildingForm({ propertyId }: { propertyId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    createBuilding,
    {}
  );
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />
      <FormError message={state.errors?._form} />
      <FormSuccess message={state.success ? state.message : undefined} />
      <Field label="Building name" name="name" error={state.errors?.name} />
      <Field
        label="Number of floors"
        name="floorsCount"
        type="number"
        required={false}
        error={state.errors?.floorsCount}
      />
      <SubmitButton variant="secondary">Add building</SubmitButton>
    </form>
  );
}
