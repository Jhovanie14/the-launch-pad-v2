import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { buildContactReplyEmail } from "@/lib/email/booking-emails";
import { FROM } from "@/lib/email/layout";

const resend = new Resend(process.env.RESEND_API_KEY);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Staff-only: answers a message from the contact form. The recipient is the
// address on that contact message, never one taken from the request body, so
// this route can't be used to send our branded email to arbitrary addresses.
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const body = (await req.json().catch(() => null)) as { id?: unknown; reply?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id : "";
    const reply = typeof body?.reply === "string" ? body.reply.trim() : "";
    if (!UUID.test(id)) throw new ApiError("Missing or invalid contact id.", 400);
    if (!reply) throw new ApiError("Missing reply.", 400);

    const { data: contact, error } = await admin
      .from("contacts")
      .select("email, first_name")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ApiError("Couldn't load the contact message.", 500);
    if (!contact?.email) throw new ApiError("Contact message not found.", 404);

    const { subject, html } = buildContactReplyEmail({ firstName: contact.first_name, reply });
    const { error: sendError } = await resend.emails.send({ from: FROM, to: contact.email, subject, html });
    if (sendError) throw new ApiError("Failed to send reply", 502);

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
