import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Supabase email links use different parameter names depending on the email provider:
  // - Resend/custom SMTP: 'token_hash'
  // - Some configurations: 'code'
  const token_hash =
    searchParams.get("token_hash") ||
    searchParams.get("code") ||
    searchParams.get("token");

  const type = searchParams.get("type") as EmailOtpType | null;
  const next = "/dashboard";

  // Create clean redirect URL
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("token");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  // Verify we have required parameters
  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Successfully verified - redirect to dashboard
      return NextResponse.redirect(redirectTo);
    }

    // Verification failed - show error
    console.error("[auth/confirm] Verification error:", error.message);
    redirectTo.pathname = "/error";
    redirectTo.searchParams.set(
      "message",
      "Email verification failed. Please try again."
    );
    return NextResponse.redirect(redirectTo);
  }

  // Missing required parameters
  console.error("[auth/confirm] Missing token or type:", {
    hasToken: !!token_hash,
    hasType: !!type,
  });
  redirectTo.pathname = "/error";
  redirectTo.searchParams.set(
    "message",
    "Invalid verification link. Please request a new one."
  );
  return NextResponse.redirect(redirectTo);
}
