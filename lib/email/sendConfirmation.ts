import { Resend } from "resend";
import { BookingConfirmationEmail } from "@/components/emails/bookingConfirmationEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmationEmail({
  to,
  customerName,
  bookingId,
  servicePackage,
  appointmentDate,
  appointmentTime,
  addOns,
}: {
  to: string;
  customerName: string;
  bookingId: string | number;
  servicePackage: string;
  appointmentDate: string;
  appointmentTime: string;
  addOns?: string[];
}) {
  const { data, error } = await resend.emails.send({
    from: "The Launch Pad Wash <noreply@thelaunchpadwash.com>",
    to,
    subject: "Your Booking Confirmation",
    // ✅ function-call style (works in .ts without JSX)
    react: BookingConfirmationEmail({
      customerName,
      bookingId,
      servicePackage,
      appointmentDate,
      appointmentTime,
      addOns,
    }),
  });

  if (error) {
    console.error("Email send error:", error);
    throw error;
  }

  return data;
}
