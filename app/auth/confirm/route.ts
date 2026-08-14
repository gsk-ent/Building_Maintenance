import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";

/**
 * Handles email verification and password-recovery links.
 * Supports both link formats:
 *  - token_hash + type  (custom email templates)
 *  - code               (default Supabase templates, PKCE exchange)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  const supabase = await createClient();

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      if (type === "email" || type === "signup") {
        await logActivity({
          userId: data.user?.id ?? null,
          action: "auth.email_verified",
          entityType: "user",
          entityId: data.user?.id,
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await logActivity({
        userId: data.user?.id ?? null,
        action: "auth.email_verified",
        entityType: "user",
        entityId: data.user?.id,
      });
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else {
    // Default template verified the email on Supabase's side and redirected
    // here without a token. If that produced a session, the flow succeeded.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
