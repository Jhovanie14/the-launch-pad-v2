import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";
import { verifyTurnstile } from "@/lib/security/verifyTurnstile";

/**
 * Contact form intake.
 *
 * This route is now the only way into `public.contacts`. The table used to
 * accept anonymous inserts, which meant the anon key — public, and shipped in
 * every page's JavaScript — was enough to POST straight at Supabase's REST API
 * and skip the form entirely. A captcha here would have been decoration while
 * that door stood open, so the migration closes it and this route writes with
 * the service role instead.
 */

/**
 * Caps exist so a single submission cannot dump megabytes into the admin
 * inbox. They are deliberately generous — a real customer with a long problem
 * to describe should never hit them.
 */
const submission = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(254),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  concern: z.string().trim().min(1, "Please choose what your message is about").max(120),
  subConcern: z.string().trim().max(120).optional(),
  message: z
    .string()
    .trim()
    .min(1, "Please include a message")
    .max(5000, "Please keep your message under 5000 characters"),
});

/**
 * Hidden field, invisible to people and irresistible to naive bots. Anything
 * that fills it gets a cheerful 200 and no database row: telling a spammer
 * they were caught just teaches them to stop filling it in.
 */
const HONEYPOT_FIELD = "company";

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || undefined;
}

export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof payload[HONEYPOT_FIELD] === "string" && payload[HONEYPOT_FIELD]) {
    console.warn("[contact] honeypot triggered, discarding submission");
    return NextResponse.json({ success: true });
  }

  const captcha = await verifyTurnstile(
    payload["cf-turnstile-response"] as string | undefined,
    clientIp(req)
  );
  if (!captcha.ok) {
    console.warn("[contact] captcha rejected:", captcha.reason);
    return NextResponse.json(
      { error: "Captcha verification failed. Please try again." },
      { status: 400 }
    );
  }

  const parsed = submission.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message || "Please check the form and try again." },
      { status: 400 }
    );
  }

  const { email, firstName, lastName, phone, concern, subConcern, message } =
    parsed.data;

  try {
    // Service role: the table no longer grants insert to anon.
    const supabase = createAdminClient();
    const { error } = await supabase.from("contacts").insert([
      {
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        concern,
        sub_concern: subConcern || null,
        message,
        status: "new",
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[contact] failed to save message:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }
}
