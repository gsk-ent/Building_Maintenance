import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordLogin } from "@/lib/auth/actions";

/**
 * OAuth / PKCE callback. Exchanges the auth code for a session,
 * ensures the profile exists (created by DB trigger), records login
 * activity, and redirects onward.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await recordLogin(data.user.id, "google");

      // Respect proxied host on Vercel so previews redirect correctly.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (isLocal) return NextResponse.redirect(`${origin}${next}`);
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Cancelled or failed OAuth flow — no secrets leaked.
  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
