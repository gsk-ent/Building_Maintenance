"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthFormState } from "@/lib/auth/actions";
import { Field, FormError, SubmitButton } from "@/components/ui/form";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError message={state.errors?._form} />
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
        autoComplete="current-password"
        error={state.errors?.password}
      />
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="font-medium text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}
