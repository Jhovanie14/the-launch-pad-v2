import { Resend } from "resend";
import { buildBookingConfirmationEmail } from "./booking-emails";
import { FROM } from "./layout";

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
  const { subject, html } = buildBookingConfirmationEmail({
    customerName,
    bookingId,
    servicePackage,
    appointmentDate,
    appointmentTime,
    addOns,
  });

  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });

  if (error) {
    console.error("Email send error:", error);
    throw error;
  }

  return data;
}
