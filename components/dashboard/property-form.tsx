"use client";

import { useActionState } from "react";
import { createProperty, type ActionState } from "@/lib/actions/properties";
import { Field, FormError, SubmitButton, TextArea } from "@/components/ui/form";

export function PropertyForm() {
  const [state, action] = useActionState<ActionState, FormData>(createProperty, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.errors?._form} />
      <Field label="Property name" name="name" error={state.errors?.name} />
      <Field label="Address line 1" name="addressLine1" error={state.errors?.addressLine1} />
      <Field label="Address line 2" name="addressLine2" required={false} error={state.errors?.addressLine2} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="City" name="city" error={state.errors?.city} />
        <Field label="State" name="state" required={false} error={state.errors?.state} />
        <Field label="Postal code" name="postalCode" required={false} error={state.errors?.postalCode} />
        <Field label="Country" name="country" defaultValue="India" error={state.errors?.country} />
      </div>
      <TextArea label="Notes" name="notes" required={false} error={state.errors?.notes} />
      <SubmitButton>Create property</SubmitButton>
    </form>
  );
}
