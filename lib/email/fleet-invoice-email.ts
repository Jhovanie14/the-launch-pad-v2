import { Resend } from "resend";
import { FROM, button, details, emailLayout, heading, money, paragraph, text } from "./layout";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface FleetInvoiceEmailParams {
  companyName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  hostedInvoiceUrl: string | undefined | null;
}

/**
 * "2026-12-01" is a calendar date: format it as-is (UTC) so it never slips a
 * day. A full timestamp is shown in Houston time.
 */
function formatDueDate(dueDate: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return dueDate;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: dateOnly ? "UTC" : "America/Chicago",
  });
}

export function buildFleetInvoiceEmail({
  companyName,
  invoiceNumber,
  amount,
  dueDate,
  hostedInvoiceUrl,
}: FleetInvoiceEmailParams): { subject: string; html: string } {
  const due = formatDueDate(dueDate);
  const payLink = hostedInvoiceUrl
    ? [
        button(hostedInvoiceUrl, "View and pay invoice"),
        paragraph(`You can pay online by credit or debit card from the invoice page.`, { muted: true, small: true }),
      ].join("\n")
    : paragraph(`To arrange payment, please contact us using the details below.`);
  const body = [
    heading("Your fleet services invoice"),
    paragraph(`Hello ${text(companyName)},`),
    paragraph(`Thank you for your continued business with The Launch Pad. Your invoice for fleet services is ready.`),
    details(
      [
        ["Invoice number", text(invoiceNumber)],
        ["Billed to", text(companyName)],
        ["Due date", text(due)],
        ["Amount due", money(amount)],
      ],
      { emphasizeLast: true },
    ),
    payLink,
    paragraph(
      `Questions about this invoice? Call us at <a href="tel:+18322198320">(832) 219-8320</a> or email <a href="mailto:info@thelaunchpadwash.com">info@thelaunchpadwash.com</a>.`,
    ),
    paragraph(`Kind regards,<br>The Launch Pad fleet services team`, { muted: true }),
  ].join("\n");

  return {
    subject: `Invoice ${invoiceNumber} from The Launch Pad - Fleet Services`,
    html: emailLayout({
      title: `Invoice ${invoiceNumber}`,
      preheader: `${money(amount)} due ${due}.`,
      body,
      footerNote: "You're receiving this because your company has a fleet services contract with The Launch Pad.",
    }),
  };
}

export async function sendFleetInvoiceEmail({
  to,
  ...params
}: FleetInvoiceEmailParams & { to: string }) {
  try {
    const { subject, html } = buildFleetInvoiceEmail(params);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Resend email error:", error);
    throw error;
  }
}
