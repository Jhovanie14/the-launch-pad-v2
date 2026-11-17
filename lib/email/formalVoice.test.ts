import { describe, expect, it, vi } from "vitest";

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn(async () => ({ error: null })) };
  },
}));

import { buildCampaignHtml } from "@/lib/marketing/campaignEmail";
import { buildDirectEmailHtml } from "./admin-message-email";
import { buildAuthTemplates } from "./auth-templates";
import { buildBookingConfirmationEmail, buildContactReplyEmail, buildReceiptEmail } from "./booking-emails";
import { buildFleetInvoiceEmail } from "./fleet-invoice-email";
import {
  buildProductOrderConfirmationEmail,
  buildProductOrderOutForDeliveryEmail,
  buildProductOrderReadyForPickupEmail,
  buildProductOrderRefundedEmail,
} from "./product-order-emails";
import {
  buildCancellationScheduledEmail,
  buildFamilyVehicleAddedEmail,
  buildFamilyVehicleRemovedEmail,
  buildPaymentFailedEmail,
  buildPrimaryVehicleSwappedEmail,
  buildSubscriptionCancelledEmail,
  buildSubscriptionInvoiceEmail,
} from "./subscription-emails";

/**
 * Every email uses the formal voice (DESIGN.md, "Email" → Voice): "Dear
 * <first name>," or "Hello,", no exclamation marks in subjects, no
 * contractions, and "You are receiving this email because…" footers.
 */
type Built = { subject: string; html: string };
const NAME = "James Carter";
const orderId = "1a2b3c4d-0000-4000-8000-000000000000";

const greeted: Record<string, Built> = {
  "booking confirmation": buildBookingConfirmationEmail({
    customerName: NAME,
    bookingId: orderId,
    servicePackage: "Express Exterior Detail",
    appointmentDate: "2026-11-20",
    appointmentTime: "10:30:00",
    addOns: [],
  }),
  receipt: buildReceiptEmail({
    customerName: NAME,
    bookingId: orderId,
    servicePackageName: "Express Exterior Detail",
    servicePackagePrice: 25,
    addOns: [],
    totalPrice: 25,
    paymentMethod: "card",
    completedAt: "2026-11-16T18:00:00Z",
  }),
  "contact reply": buildContactReplyEmail({ firstName: "James", reply: "Thank you for your message." }),
  "membership renewed": buildSubscriptionInvoiceEmail({
    name: NAME,
    amountPaid: 39.99,
    billingPeriodStart: "June 1, 2026",
    billingPeriodEnd: "June 30, 2026",
    invoiceUrl: null,
    isRenewal: true,
  }),
  "payment failed": buildPaymentFailedEmail({ name: NAME, attemptCount: 1 }),
  "payment failed (final)": buildPaymentFailedEmail({ name: NAME, attemptCount: 3 }),
  "cancellation scheduled": buildCancellationScheduledEmail({ name: NAME, periodEndDate: "December 16, 2026" }),
  "membership ended": buildSubscriptionCancelledEmail({ name: NAME }),
  "vehicle added": buildFamilyVehicleAddedEmail({ name: NAME, licensePlate: "ABC1234", newTotal: 64.99, billingCycle: "month" }),
  "vehicle removed": buildFamilyVehicleRemovedEmail({
    name: NAME,
    licensePlate: "ABC1234",
    newTotal: 39.99,
    billingCycle: "month",
  }),
  "primary swapped": buildPrimaryVehicleSwappedEmail({
    name: NAME,
    oldPrimaryLabel: "2020 Honda Civic (ABC1234)",
    newPrimaryLabel: "2022 Ram 1500 (SPD6507)",
    newTotal: 39.99,
    billingCycle: "month",
  }),
  "order confirmed": buildProductOrderConfirmationEmail({
    to: "x@example.com",
    name: NAME,
    orderId,
    items: [{ name: "Tire Shine", quantity: 1, unit_price: 10 }],
    subtotal: 10,
    deliveryFee: 0,
    total: 10,
    fulfillmentMethod: "pickup",
  }),
  "order ready": buildProductOrderReadyForPickupEmail({ to: "x@example.com", name: NAME, orderId }),
  "order out for delivery": buildProductOrderOutForDeliveryEmail({ to: "x@example.com", name: NAME, orderId }),
  "order refunded": buildProductOrderRefundedEmail({ to: "x@example.com", name: NAME, orderId, total: 10 }),
};

const ungreeted: Record<string, Built> = {
  "fleet invoice": buildFleetInvoiceEmail({
    companyName: "Acme Logistics",
    invoiceNumber: "INV-0042",
    amount: 1250,
    dueDate: "2026-12-01",
    hostedInvoiceUrl: "https://invoice.stripe.com/i/x",
  }),
  ...Object.fromEntries(buildAuthTemplates().map((t) => [`account: ${t.dashboardName}`, t])),
};

const CONTRACTION =
  /\b(you're|we're|we'll|you'll|it's|that's|here's|didn't|don't|can't|isn't|won't|you've|we've|there's|let's|what's|i'm|we'd|you'd|wasn't|aren't|haven't)\b/i;

/** The words a reader sees: tags and the hidden preheader filler removed, entities decoded. */
function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&rsquo;|’/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

describe.each(Object.entries({ ...greeted, ...ungreeted }))("%s: formal voice", (_name, email) => {
  it("has no exclamation mark in the subject", () => {
    expect(email.subject).not.toContain("!");
  });

  it("uses no contractions", () => {
    expect(visibleText(email.html)).not.toMatch(CONTRACTION);
    expect(email.subject).not.toMatch(CONTRACTION);
  });

  it("explains why they got it formally", () => {
    expect(email.html).toContain("You are receiving this email because");
  });
});

describe("staff-written emails: the parts our code adds", () => {
  it("direct email's contact line uses no contractions", () => {
    const html = buildDirectEmailHtml({ subject: "Your account", body: "Thank you." });
    expect(visibleText(html)).not.toMatch(CONTRACTION);
  });

  it("campaign footer explains why they got it formally", () => {
    const html = buildCampaignHtml({ subject: "News", body: "Thank you." }, { unsubscribeUrl: "https://x.test/u" });
    expect(html).toContain("You are receiving this email because");
    expect(visibleText(html)).not.toMatch(CONTRACTION);
  });
});

describe.each(Object.entries(greeted))("%s: greeting", (_name, email) => {
  it("opens with 'Dear <first name>,' rather than 'Hi'", () => {
    expect(email.html).toContain("Dear James,");
    expect(visibleText(email.html)).not.toMatch(/\bHi\b/);
  });
});
