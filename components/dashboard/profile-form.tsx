"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import type { ActionState } from "@/lib/actions/properties";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/components/ui/form";

export function ProfileForm({
  fullName,
  phone,
}: {
  fullName: string;
  phone: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateProfile,
    {}
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.errors?._form} />
      <FormSuccess message={state.success ? state.message : undefined} />
      <Field
        label="Full name"
        name="fullName"
        defaultValue={fullName}
        error={state.errors?.fullName}
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        required={false}
        defaultValue={phone}
        error={state.errors?.phone}
      />
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
