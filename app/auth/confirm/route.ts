import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Accept token or token_hash — Supabase is using token
  const token_hash =
    searchParams.get("token") || searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType) || "signup";
  const next = "/dashboard";

  console.log("[confirm] Received:", { token_hash, type });

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token");
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");

  if (token_hash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      console.log("[confirm] Success");
      return NextResponse.redirect(redirectTo);
    }

    console.error("[confirm] verifyOtp error:", error.message);
    redirectTo.pathname = "/error";
    redirectTo.searchParams.set("reason", error.message);
    return NextResponse.redirect(redirectTo);
  }

  console.error("[confirm] No token in URL");
  redirectTo.pathname = "/error";
  redirectTo.searchParams.set("reason", "Missing verification token");
  return NextResponse.redirect(redirectTo);
}
