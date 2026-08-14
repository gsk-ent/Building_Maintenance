"use client";

import { useActionState } from "react";
import { requestPasswordReset, type AuthFormState } from "@/lib/auth/actions";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/components/ui/form";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    {},
  );
  if (state.success) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.errors?._form} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={state.errors?.email}
      />
      <SubmitButton>Send reset link</SubmitButton>
    </form>
  );
}
