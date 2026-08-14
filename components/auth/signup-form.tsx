"use client";

import { useActionState } from "react";
import { signUp, type AuthFormState } from "@/lib/auth/actions";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/components/ui/form";

export function SignupForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(signUp, {});
  if (state.success) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.errors?._form} />
      <Field
        label="Full name"
        name="fullName"
        autoComplete="name"
        error={state.errors?.fullName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={state.errors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={state.errors?.password}
      />
      <Field
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        error={state.errors?.confirmPassword}
      />
      <p className="text-xs text-muted">
        At least 10 characters with upper- and lowercase letters and a number.
      </p>
      <SubmitButton>Create account</SubmitButton>
    </form>
  );
}
