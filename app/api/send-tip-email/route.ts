import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { buildTipEmail } from "@/lib/email/booking-emails";
import { FROM } from "@/lib/email/layout";
import { parseBookingId, recipientFromBooking } from "@/lib/email/bookingRecipient";

const resend = new Resend(process.env.RESEND_API_KEY);

// Staff-only: sent when an admin marks a booking completed. The recipient is
// always the booking's own customer, never an address from the request body.
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const bookingId = parseBookingId(await req.json().catch(() => null));
    const { data: booking } = await admin
      .from("bookings")
      .select("id, customer_email, customer_name")
      .eq("id", bookingId)
      .maybeSingle();
    const { email, name } = recipientFromBooking(booking);

    const { subject, html } = buildTipEmail({ customerName: name, bookingId });

    const { error: sendError } = await resend.emails.send({ from: FROM, to: email, subject, html });

    if (sendError) {
      console.error("[send-tip-email] Resend error:", sendError);
      throw new ApiError("Failed to send tip email", 502);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
