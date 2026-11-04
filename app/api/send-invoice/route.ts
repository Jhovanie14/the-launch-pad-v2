import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { escapeHtml } from "@/lib/email/escapeHtml";
import { parseBookingId, recipientFromBooking } from "@/lib/email/bookingRecipient";

// Staff-only: sent when an admin marks a booking completed. The receipt always
// goes to the booking's own customer, never to an address from the request body.
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const bookingId = parseBookingId(await req.json().catch(() => null));
    const resend = new Resend(process.env.RESEND_API_KEY!);

    // 1️⃣ Fetch booking and its add-ons
    const { data: booking, error } = await admin
      .from("bookings")
      .select(
        `
        id,
        customer_email,
        customer_name,
        service_package_name,
        service_package_price,
        total_price,
        payment_method,
        completed_at,
        booking_add_ons (
          add_ons (
            name,
            price
          )
        )
      `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error) throw error;
    if (!booking) throw new ApiError("Booking not found", 404);
    const { email, name } = recipientFromBooking(booking);

    // Flatten add-ons from nested relation
    const addOns = booking.booking_add_ons?.map((ba: any) => ba.add_ons) || [];

    // 2️⃣ Build PDF Receipt
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const color = rgb(0.42, 0.36, 0.58);

    const completedAt = booking.completed_at
      ? new Date(booking.completed_at)
      : new Date();

    let y = 800;

    // Header
    page.drawText("Car Wash Receipt", {
      x: 50,
      y,
      size: 22,
      font: boldFont,
      color,
    });
    y -= 40;

    page.drawText(`Date: ${completedAt.toLocaleDateString()}`, {
      x: 50,
      y,
      size: 11,
      font,
    });
    page.drawText(`Receipt #: ${booking.id}`, {
      x: 300,
      y,
      size: 11,
      font,
    });

    // Customer details
    y -= 40;
    page.drawText("Customer:", { x: 50, y, size: 12, font: boldFont });
    y -= 18;
    page.drawText(name, { x: 50, y, size: 11, font });
    y -= 15;
    page.drawText(email, { x: 50, y, size: 11, font });

    // Service section
    y -= 40;
    page.drawText("Service Details", {
      x: 50,
      y,
      size: 13,
      font: boldFont,
      color,
    });
    y -= 20;

    page.drawText("Item", { x: 50, y, size: 11, font: boldFont });
    page.drawText("Price", { x: 400, y, size: 11, font: boldFont });
    y -= 18;

    // Base service
    page.drawText(booking.service_package_name || "Service", {
      x: 50,
      y,
      size: 11,
      font,
    });
    page.drawText(`$${Number(booking.service_package_price).toFixed(2)}`, {
      x: 400,
      y,
      size: 11,
      font,
    });
    y -= 18;

    // Add-ons
    if (addOns.length > 0) {
      y -= 10;
      page.drawText("Add-ons:", { x: 50, y, size: 11, font: boldFont, color });
      y -= 18;

      addOns.forEach((addon: any) => {
        page.drawText(`• ${addon.name}`, { x: 70, y, size: 10, font });
        page.drawText(`$${Number(addon.price).toFixed(2)}`, {
          x: 400,
          y,
          size: 10,
          font,
        });
        y -= 15;
      });
    }

    // Divider
    y -= 10;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 520, y },
      thickness: 1,
      color,
    });
    y -= 25;

    // Totals
    page.drawText("Total Paid:", {
      x: 320,
      y,
      size: 12,
      font: boldFont,
      color,
    });
    page.drawText(`$${Number(booking.total_price).toFixed(2)}`, {
      x: 400,
      y,
      size: 12,
      font: boldFont,
    });

    y -= 20;
    page.drawText(`Payment Method: ${booking.payment_method}`, {
      x: 320,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Footer
    y -= 50;
    page.drawText("Thank you for choosing The Launch Pad Car Wash!", {
      x: 50,
      y,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    y -= 20;

    // Business contact info
    page.drawText("10410 S Main St, Houston, TX, United States, Texas", {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 15;
    page.drawText("Phone: (832) 219-8320 | www.thelaunchpadwash.com", {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Finalize PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // 3️⃣ Send Email via Resend
    const { error: sendError } = await resend.emails.send({
      from: "The Launch Pad Wash <noreply@thelaunchpadwash.com>",
      to: email,
      subject: "Your Car Wash Receipt",
      html: `
        <p>Hi ${escapeHtml(name) || "there"},</p>
        <p>Thank you for your booking! Please find your receipt attached below.</p>
        <p>– The The Launch Pad Team</p>
      `,
      attachments: [
        {
          filename: `receipt-${booking.id}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (sendError) {
      console.error("[send-invoice] Resend error:", sendError);
      throw new ApiError("Failed to send invoice", 502);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
