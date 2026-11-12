import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { unsubscribeByToken } from "@/lib/marketing/unsubscribeLink";

/**
 * One-click unsubscribe (RFC 8058): Gmail, Apple Mail and others POST here
 * from the List-Unsubscribe header of automatic marketing emails. A GET (a
 * person pasting the link) goes to the confirmation page instead, so link
 * scanners that prefetch URLs can never unsubscribe anyone.
 */
export async function POST(req: NextRequest) {
  try {
    const result = await unsubscribeByToken(
      createAdminClient(),
      req.nextUrl.searchParams.get("t"),
      process.env.MARKETING_UNSUBSCRIBE_SECRET,
    );
    if (!result.ok) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    return NextResponse.json({ unsubscribed: true });
  } catch (err) {
    console.error("[marketing/unsubscribe] failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export function GET(req: NextRequest) {
  const url = new URL("/unsubscribe", req.nextUrl.origin);
  const t = req.nextUrl.searchParams.get("t");
  if (t) url.searchParams.set("t", t);
  return NextResponse.redirect(url);
}
