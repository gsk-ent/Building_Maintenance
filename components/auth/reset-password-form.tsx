"use client";

import { useActionState } from "react";
import { updatePassword, type AuthFormState } from "@/lib/auth/actions";
import { Field, FormError, SubmitButton } from "@/components/ui/form";

export function ResetPasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(
    updatePassword,
    {},
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.errors?._form} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={state.errors?.password}
      />
      <Field
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        error={state.errors?.confirmPassword}
      />
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
