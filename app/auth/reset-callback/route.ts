import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/reset-password";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }

    // If error, redirect to error page or forgot password with message
    redirectTo.pathname = "/forgot-password";
    redirectTo.searchParams.set(
      "error",
      "Invalid or expired reset link. Please request a new one."
    );
    return NextResponse.redirect(redirectTo);
  }

  // No code found
  redirectTo.pathname = "/forgot-password";
  redirectTo.searchParams.set("error", "Invalid reset link.");
  return NextResponse.redirect(redirectTo);
}
