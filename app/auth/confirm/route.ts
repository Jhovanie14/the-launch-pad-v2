import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { applySignupConsent } from "@/lib/marketing/signupConsent";

/** Records the signup marketing tick, now that the email is verified. */
async function recordSignupConsent(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await applySignupConsent(createAdminClient(), user);
  } catch (err) {
    console.error("[auth/confirm] signup consent skipped:", err);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const token_hash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;

  const nextParam = searchParams.get("next") || "/dashboard";

  // 🔥 FIX: Properly parse next into path + query
  const nextUrl = new URL(nextParam, request.nextUrl.origin);

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = nextUrl.pathname;
  redirectTo.search = nextUrl.search;

  // Cleanup auth params
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  const supabase = await createClient();

  // PKCE flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await recordSignupConsent(supabase);
      return NextResponse.redirect(redirectTo);
    }

    console.error("[auth/confirm] exchangeCodeForSession error:", error.message, error.status);

    // Already verified (double-click or scanner) — redirect if session exists
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.redirect(redirectTo);
    }

    redirectTo.pathname = "/error";
    redirectTo.search = "?message=Email verification failed.";
    return NextResponse.redirect(redirectTo);
  }

  // OTP flow
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      await recordSignupConsent(supabase);
      return NextResponse.redirect(redirectTo);
    }

    // If token is already used, check if user is already logged in and redirect them
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.redirect(redirectTo);
    }

    redirectTo.pathname = "/error";
    redirectTo.search = `?message=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(redirectTo);
  }

  redirectTo.pathname = "/error";
  redirectTo.search = "?message=Invalid verification link.";
  return NextResponse.redirect(redirectTo);
}
