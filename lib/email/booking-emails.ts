/**
 * Booking emails: confirmation, post-detail thank-you (tip), receipt, and the
 * admin's reply to a contact message. Pure builders (no I/O) so they can be
 * unit tested and previewed; the routes and senders call them.
 */
import {
  EMAIL_COLORS,
  SITE_URL,
  button,
  details,
  emailLayout,
  heading,
  list,
  money,
  paragraph,
  signoff,
  subheading,
  text,
} from "./layout";

const C = EMAIL_COLORS;

export const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=10410+S+Main+St,+Houston,+TX+77025";
const GOOGLE_REVIEW_URL = "https://g.page/r/CZw2a77VbVUUEBM/review";
const TIP_URL = "https://buy.stripe.com/bJeaEW32W1WD4tHeq9cwg01";
const CONTACT_EMAIL = "info@thelaunchpadwash.com";

export interface BuiltEmail {
  subject: string;
  html: string;
}

/**
 * "2026-11-08" → "Sun, Nov 8, 2026". The value is a calendar date, so it is
 * read and printed in UTC: it never shifts a day with the server's timezone.
 */
export function formatCalendarDate(value: string): string {
  const day = String(value ?? "").slice(0, 10);
  const date = new Date(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(date.getTime())) return String(value ?? "");
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "10:30" or "14:05:00" → "10:30 AM" / "2:05 PM". */
export function formatClockTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
  if (!match) return String(value ?? "");
  const hours = Number(match[1]);
  if (hours > 23) return String(value);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${match[2]} ${suffix}`;
}

/** Short booking reference, as staff see it: "#1a2b3c4d". */
export function bookingReference(bookingId: string | number): string {
  return `#${String(bookingId).slice(0, 8)}`;
}

function greeting(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  return paragraph(`Hi ${trimmed ? text(trimmed) : "there"},`);
}

// ---------------------------------------------------------------------------
// Booking confirmation
// ---------------------------------------------------------------------------

export interface BookingConfirmationParams {
  customerName: string;
  bookingId: string | number;
  servicePackage: string;
  /** Calendar date, "YYYY-MM-DD". */
  appointmentDate: string;
  /** "HH:MM" or "HH:MM:SS". */
  appointmentTime: string;
  addOns?: string[];
}

export function buildBookingConfirmationEmail(params: BookingConfirmationParams): BuiltEmail {
  const date = formatCalendarDate(params.appointmentDate);
  const time = formatClockTime(params.appointmentTime);
  const addOns = (params.addOns ?? []).filter((a) => a && a.trim());

  const rows: Array<[string, string]> = [
    ["Service", text(params.servicePackage)],
    ["Date", text(date)],
    ["Time", text(time)],
  ];
  if (addOns.length > 0) rows.push(["Add-ons", addOns.map((a) => text(a)).join(", ")]);
  rows.push(["Booking reference", text(bookingReference(params.bookingId))]);

  const body = [
    heading("You're booked"),
    greeting(params.customerName),
    paragraph("Your appointment is confirmed. Here are the details:"),
    details(rows),
    subheading("What to expect"),
    list([
      `We're at <strong>10410 S Main St, Houston, TX 77025</strong>.`,
      "Please arrive about 10 minutes before your appointment.",
      "If you need to reschedule, let us know at least 24 hours ahead.",
    ]),
    button(DIRECTIONS_URL, "Get directions"),
    button(`${SITE_URL}/dashboard/bookings`, "View or change your booking", "secondary"),
    signoff(),
  ].join("\n");

  const title = `You're booked for ${date} at ${time}`;
  return {
    subject: title,
    html: emailLayout({
      title,
      preheader: `${params.servicePackage} on ${date} at ${time}, 10410 S Main St.`,
      body,
      footerNote: "You're getting this because you booked an appointment at The Launch Pad.",
    }),
  };
}

// ---------------------------------------------------------------------------
// Post-detail thank-you (tip)
// ---------------------------------------------------------------------------

export interface TipEmailParams {
  customerName: string;
  bookingId: string;
}

export function buildTipEmail({ customerName, bookingId }: TipEmailParams): BuiltEmail {
  const tipLink = `${TIP_URL}?booking=${encodeURIComponent(bookingId)}`;

  const body = [
    heading("Thanks for coming in"),
    greeting(customerName),
    paragraph(
      "We just finished your car, and it's looking great. Our crew took care with every detail, and we hope it shows.",
    ),
    paragraph(
      "If the result made your day, a tip is a kind way to say thanks. Every tip goes to the attendants who worked on your car.",
    ),
    button(tipLink, "Leave a tip"),
    paragraph("Happy with how it turned out? A Google review helps other drivers find us."),
    button(GOOGLE_REVIEW_URL, "Leave a Google review", "secondary"),
    paragraph("No pressure either way. We're glad you came by.", { muted: true, small: true }),
    signoff(),
  ].join("\n");

  return {
    subject: "Your car looks incredible — help us celebrate!",
    html: emailLayout({
      title: "Thanks for coming in",
      preheader: "Your car is done. If you loved the result, you can leave the crew a tip.",
      body,
      footerNote: "You're getting this because your car was just serviced at The Launch Pad.",
    }),
  };
}

// ---------------------------------------------------------------------------
// Receipt
// ---------------------------------------------------------------------------

export interface ReceiptEmailParams {
  customerName: string;
  bookingId: string;
  servicePackageName: string | null;
  servicePackagePrice: number | string | null;
  addOns: Array<{ name: string | null; price: number | string | null }>;
  totalPrice: number | string | null;
  paymentMethod: string | null;
  /** ISO timestamp the service was completed; defaults to now. */
  completedAt: string | Date | null;
}

function amount(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return money(Number.isFinite(n) ? n : 0);
}

function paymentMethodLabel(value: string | null): string {
  if (!value) return "";
  const words = value.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function receiptTable(rows: Array<[string, string]>, total: string): string {
  const cell = `padding:10px 0;border-bottom:1px solid ${C.lineSoft};font-size:15px;color:${C.ink};vertical-align:top;`;
  const head = `padding:0 0 8px;border-bottom:1px solid ${C.line};font-size:13px;font-weight:600;color:${C.inkMuted};text-transform:uppercase;letter-spacing:0.04em;`;
  const itemRows = rows
    .map(
      ([name, price]) =>
        `<tr><td align="left" style="${cell}">${text(name)}</td><td align="right" style="${cell}white-space:nowrap;">${text(price)}</td></tr>`,
    )
    .join("\n");
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;border-collapse:collapse;">
  <caption style="text-align:left;font-size:13px;color:${C.inkMuted};padding:0 0 8px;">What you paid for</caption>
  <thead><tr><th scope="col" align="left" style="${head}">Item</th><th scope="col" align="right" style="${head}">Price</th></tr></thead>
  <tbody>
${itemRows}
  </tbody>
  <tfoot><tr><th scope="row" align="left" style="padding:14px 0 0;font-size:16px;font-weight:800;color:${C.ink};">Total paid</th><td align="right" style="padding:14px 0 0;font-size:20px;font-weight:900;color:${C.ink};white-space:nowrap;">${text(total)}</td></tr></tfoot>
</table>`;
}

export function buildReceiptEmail(params: ReceiptEmailParams): BuiltEmail {
  const completed = params.completedAt ? new Date(params.completedAt) : new Date();
  const date = Number.isNaN(completed.getTime())
    ? ""
    : completed.toLocaleDateString("en-US", {
        timeZone: "America/Chicago",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  const total = amount(params.totalPrice);

  const items: Array<[string, string]> = [
    [params.servicePackageName || "Service", amount(params.servicePackagePrice)],
    ...params.addOns.map((a): [string, string] => [`Add-on: ${a.name ?? "Add-on"}`, amount(a.price)]),
  ];

  const facts: Array<[string, string]> = [["Receipt", text(bookingReference(params.bookingId))]];
  if (date) facts.push(["Date", text(date)]);
  const method = paymentMethodLabel(params.paymentMethod);
  if (method) facts.push(["Paid with", text(method)]);

  const body = [
    heading("Your receipt"),
    greeting(params.customerName),
    paragraph("Thanks for coming in. Here's what you paid for. A PDF copy is attached for your records."),
    details(facts),
    receiptTable(items, total),
    button(`${SITE_URL}/dashboard/bookings`, "View your bookings"),
    signoff(),
  ].join("\n");

  return {
    subject: "Your Car Wash Receipt",
    html: emailLayout({
      title: "Your receipt from The Launch Pad",
      preheader: `${total} paid${date ? ` on ${date}` : ""}. Your PDF receipt is attached.`,
      body,
      footerNote: "You're getting this because your car was serviced at The Launch Pad.",
    }),
  };
}

// ---------------------------------------------------------------------------
// Contact reply
// ---------------------------------------------------------------------------

export interface ContactReplyParams {
  firstName?: string | null;
  reply: string;
}

export function buildContactReplyEmail({ firstName, reply }: ContactReplyParams): BuiltEmail {
  const message = text(String(reply ?? "")).replace(/\r?\n/g, "<br>");
  const body = [
    heading("A reply from The Launch Pad"),
    greeting(typeof firstName === "string" ? firstName : ""),
    paragraph(message),
    paragraph("Want to follow up? Write to us and we'll get back to you.", { muted: true }),
    button(`mailto:${CONTACT_EMAIL}`, "Write back to us"),
    signoff(),
  ].join("\n");

  return {
    subject: "A reply from The Launch Pad",
    html: emailLayout({
      title: "A reply from The Launch Pad",
      preheader: "We've answered your message.",
      body,
      footerNote: "You're getting this because you contacted us.",
    }),
  };
}
