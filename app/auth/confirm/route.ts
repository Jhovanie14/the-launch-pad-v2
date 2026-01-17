import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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
