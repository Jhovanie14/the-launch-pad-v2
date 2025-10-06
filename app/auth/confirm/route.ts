import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/dashboard";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  const supabase = await createClient();

  // PKCE Flow: Handle code-based verification (Resend/SMTP)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }

    redirectTo.pathname = "/error";
    redirectTo.searchParams.set(
      "message",
      "Email verification failed. Please try again."
    );
    return NextResponse.redirect(redirectTo);
  }

  // Legacy OTP Flow: Handle token_hash verification
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }

    redirectTo.pathname = "/error";
    redirectTo.searchParams.set("message", error.message);
    return NextResponse.redirect(redirectTo);
  }

  // No valid parameters found
  redirectTo.pathname = "/error";
  redirectTo.searchParams.set("message", "Invalid verification link.");
  return NextResponse.redirect(redirectTo);
}
