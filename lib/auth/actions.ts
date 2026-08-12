"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import {
  fieldErrors,
  loginSchema,
  passwordSchema,
  signupSchema,
  emailSchema,
} from "@/lib/validation";
import { safeRedirectPath } from "@/lib/activity/sanitize";

export interface AuthFormState {
  errors?: Record<string, string>;
  message?: string;
  success?: boolean;
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}



export async function signUp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (error) {
    return { errors: { _form: friendlyAuthError(error.message) } };
  }

  await logActivity({
    userId: data.user?.id ?? null,
    action: "auth.signup",
    entityType: "user",
    entityId: data.user?.id,
    metadata: { provider: "email" },
  });

  return {
    success: true,
    message:
      "Account created. Check your email for a verification link before signing in.",
  };
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { errors: { _form: friendlyAuthError(error.message) } };
  }

  await recordLogin(data.user.id, "email");
  redirect(safeRedirectPath(formData.get("next")));
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const next = safeRedirectPath(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    redirect("/auth/auth-error");
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  if (user) {
    await logActivity({
      userId: user.id,
      action: "auth.logout",
      entityType: "user",
      entityId: user.id,
    });
  }
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { errors: { email: "Enter a valid email address" } };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  });

  await logActivity({
    userId: null,
    action: "auth.password_reset_requested",
    entityType: "user",
    // Do not store the email in plaintext metadata for privacy.
  });

  // Always report success — do not leak which emails exist.
  return {
    success: true,
    message: "If an account exists for that email, a reset link has been sent.",
  };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) {
    return { errors: { password: parsed.error.issues[0]?.message ?? "Invalid password" } };
  }
  if (formData.get("password") !== formData.get("confirmPassword")) {
    return { errors: { confirmPassword: "Passwords do not match" } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { errors: { _form: "Your reset link has expired. Request a new one." } };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return { errors: { _form: friendlyAuthError(error.message) } };
  }

  await logActivity({
    userId: user.id,
    action: "auth.password_changed",
    entityType: "user",
    entityId: user.id,
  });

  redirect("/dashboard");
}

/** Update last_login_at / login_count and record the login activity. */
export async function recordLogin(userId: string, provider: "email" | "google") {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, login_count")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile) {
    await supabase
      .from("profiles")
      .update({
        last_login_at: new Date().toISOString(),
        login_count: profile.login_count + 1,
      })
      .eq("id", profile.id);
  }
  await logActivity({
    userId,
    action: "auth.login",
    entityType: "user",
    entityId: userId,
    metadata: { provider },
  });
}

function friendlyAuthError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "Incorrect email or password.",
    "Email not confirmed":
      "Please verify your email first — check your inbox for the confirmation link.",
    "User already registered": "An account with this email already exists.",
  };
  return known[message] ?? "Something went wrong. Please try again.";
}
