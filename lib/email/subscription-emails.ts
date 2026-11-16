import { Resend } from "resend";
import {
  FLOCK_DISCOUNT_RATE,
  MAX_VEHICLES_PER_SUBSCRIPTION,
} from "@/lib/pricing/flockPricing";
import {
  FROM,
  SITE_URL,
  button,
  contactLine,
  details,
  emailLayout,
  heading,
  list,
  money,
  notice,
  paragraph,
  plate,
  salutation,
  signoff,
  subheading,
  text,
} from "./layout";

export { FROM, SITE_URL };

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Family-discount percent for marketing copy in plan-agnostic emails (dunning,
 * win-back). Plan-specific emails take an explicit `discountPercent` instead,
 * because commercial plans get no family discount at all.
 */
const FAMILY_DISCOUNT_PERCENT = Math.round(FLOCK_DISCOUNT_RATE * 100);

const BILLING_URL = `${SITE_URL}/dashboard/billing`;
const MEMBER_FOOTER = "You are receiving this email because you have a Launch Pad membership.";

export interface BuiltEmail {
  subject: string;
  html: string;
}

function recurringTotal(newTotal: number, billingCycle: string): string {
  return `${money(newTotal)}/${text(billingCycle)}`;
}

async function sendBuilt(to: string, email: BuiltEmail, label: string) {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: email.subject,
    html: email.html,
  });

  if (error) console.error(`[email] ${label} send error:`, error);
  else console.log(`[email] ${label} email sent to:`, to);
}

// ─────────────────────────────────────────────────────────────
// 1. SUBSCRIPTION INVOICE / RECEIPT
// ─────────────────────────────────────────────────────────────
export interface SubscriptionInvoiceEmailParams {
  name: string;
  amountPaid: number; // in dollars
  billingPeriodStart: string; // e.g. "June 1, 2025"
  billingPeriodEnd: string; // e.g. "June 30, 2025"
  invoiceUrl?: string | null;
  isRenewal: boolean;
}

export function buildSubscriptionInvoiceEmail({
  name,
  amountPaid,
  billingPeriodStart,
  billingPeriodEnd,
  invoiceUrl,
  isRenewal,
}: SubscriptionInvoiceEmailParams): BuiltEmail {
  const title = isRenewal ? "Your membership has renewed" : "Welcome to The Launch Pad";
  const subject = isRenewal
    ? `Your membership has renewed: ${money(amountPaid)} charged`
    : "Welcome to The Launch Pad: your membership is active";

  const body = [
    heading(title),
    salutation(name),
    paragraph(
      isRenewal
        ? "Your membership has renewed and your payment has been received. A summary is below."
        : "Thank you for becoming a member. Your first payment has been received and your membership is now active. Your receipt is below.",
    ),
    details(
      [
        ["Billing period", `${text(billingPeriodStart)} – ${text(billingPeriodEnd)}`],
        ["Status", "Paid"],
        ["Amount paid", money(amountPaid)],
      ],
      { emphasizeLast: true },
    ),
    invoiceUrl
      ? button(invoiceUrl, "View full invoice") +
        paragraph(
          `Your billing history and plan are on your <a href="${text(BILLING_URL)}">billing page</a>.`,
          { muted: true, small: true },
        )
      : button(BILLING_URL, "View billing"),
    paragraph(isRenewal ? "Thank you for being a member." : "We look forward to welcoming you."),
    signoff(),
  ].join("\n");

  return {
    subject,
    html: emailLayout({
      title,
      preheader: `${money(amountPaid)} paid for ${billingPeriodStart} – ${billingPeriodEnd}`,
      body,
      footerNote: MEMBER_FOOTER,
    }),
  };
}

export async function sendSubscriptionInvoiceEmail({
  to,
  ...params
}: SubscriptionInvoiceEmailParams & { to: string }) {
  await sendBuilt(to, buildSubscriptionInvoiceEmail(params), "subscription invoice");
}

// ─────────────────────────────────────────────────────────────
// 2. PAYMENT FAILED — update card
// ─────────────────────────────────────────────────────────────
export interface PaymentFailedEmailParams {
  name: string;
  attemptCount?: number;
}

export function buildPaymentFailedEmail({ name, attemptCount }: PaymentFailedEmailParams): BuiltEmail {
  const isLastAttempt = (attemptCount ?? 1) >= 3;
  const title = isLastAttempt ? "Final notice: your payment failed" : "Your payment was not successful";
  const subject = isLastAttempt
    ? "Final notice: please update your card to keep your membership"
    : "Action needed: your payment was not successful";

  const body = [
    heading(title),
    salutation(name),
    paragraph(
      "We were unable to charge your card for your membership. Please update your payment method to keep your membership active.",
    ),
    notice(
      isLastAttempt
        ? "<strong>This was our final attempt.</strong> Please update your card today, or your membership will be cancelled."
        : "<strong>Your membership is still active.</strong> Please update your card soon to keep it running.",
      isLastAttempt ? "danger" : "warn",
    ),
    paragraph("If the payment cannot be completed:"),
    list([
      "Your membership will be suspended after the retries fail",
      "Unlimited express washes will no longer be available",
      "Family pricing on your other vehicles will end",
    ]),
    button(BILLING_URL, "Update payment method"),
    paragraph(
      "Updating your card takes less than a minute, and your membership continues as soon as a payment succeeds.",
      { muted: true, small: true },
    ),
    contactLine("Should you have any questions, we are glad to help."),
    signoff(),
  ].join("\n");

  return {
    subject,
    html: emailLayout({
      title,
      preheader: isLastAttempt
        ? "Update your card today to keep your membership."
        : "Update your card to keep your membership active.",
      body,
      footerNote: MEMBER_FOOTER,
    }),
  };
}

export async function sendPaymentFailedEmail({
  to,
  ...params
}: PaymentFailedEmailParams & { to: string }) {
  await sendBuilt(to, buildPaymentFailedEmail(params), "payment failed");
}

// ─────────────────────────────────────────────────────────────
// 3. CANCELLATION SCHEDULED — retention email
// ─────────────────────────────────────────────────────────────
export interface CancellationScheduledEmailParams {
  name: string;
  periodEndDate: string; // human-readable e.g. "June 15, 2025"
}

export function buildCancellationScheduledEmail({
  name,
  periodEndDate,
}: CancellationScheduledEmailParams): BuiltEmail {
  const title = "Your cancellation is confirmed";

  const body = [
    heading(title),
    salutation(name),
    paragraph(
      `We have received your request to cancel your membership. You keep full access until <strong>${text(periodEndDate)}</strong>.`,
    ),
    details([["Membership active until", text(periodEndDate)]]),
    subheading("What ends with your plan"),
    list([
      "Unlimited express washes every month",
      `Family pricing on additional vehicles, up to ${FAMILY_DISCOUNT_PERCENT}% off`,
      "Priority service, ahead of the regular line",
      "Walk-in visits with no appointment needed",
    ]),
    paragraph(
      "Should you change your mind, you can keep your membership with one click. There is no need to re-enroll, and your vehicles stay linked.",
    ),
    button(BILLING_URL, "Keep my membership"),
    paragraph(
      `You can reactivate from your billing page any time before ${text(periodEndDate)}.`,
      { muted: true, small: true },
    ),
    contactLine("If there is anything we could have done better, we would be grateful to hear it."),
    signoff(),
  ].join("\n");

  return {
    subject: `Your membership ends on ${periodEndDate}`,
    html: emailLayout({
      title,
      preheader: `Your membership stays active until ${periodEndDate}.`,
      body,
      footerNote: MEMBER_FOOTER,
    }),
  };
}

export async function sendCancellationScheduledEmail({
  to,
  ...params
}: CancellationScheduledEmailParams & { to: string }) {
  await sendBuilt(to, buildCancellationScheduledEmail(params), "cancellation scheduled");
}

// ─────────────────────────────────────────────────────────────
// 4. SUBSCRIPTION CANCELLED — win-back email
// ─────────────────────────────────────────────────────────────
export interface SubscriptionCancelledEmailParams {
  name: string;
}

export function buildSubscriptionCancelledEmail({ name }: SubscriptionCancelledEmailParams): BuiltEmail {
  const plansUrl = `${SITE_URL}/dashboard/pricing`;
  const title = "Your membership has ended";

  const body = [
    heading(title),
    salutation(name),
    paragraph(
      "Your membership has now ended. Thank you for the time you spent with us.",
    ),
    subheading("Should you wish to return"),
    list([
      "<strong>Unlimited washes</strong>: keep your car clean every week",
      "<strong>Plans from $39.99 a month</strong>: Basic $39.99 or Deluxe $59.99, any vehicle",
      `<strong>Family pricing</strong>: add up to ${MAX_VEHICLES_PER_SUBSCRIPTION - 1} more vehicles, up to ${FAMILY_DISCOUNT_PERCENT}% off`,
      "<strong>Priority service</strong>: no waiting in the regular line",
    ]),
    paragraph(
      "Rejoining takes under a minute. Your vehicles and history are saved, so you need only choose a plan.",
    ),
    button(plansUrl, "See plans and rejoin"),
    paragraph("There is no contract, and you may cancel at any time.", { muted: true, small: true }),
    contactLine("If anything could have been better, we would be grateful to hear from you."),
    signoff(),
  ].join("\n");

  return {
    subject: "Your Launch Pad membership has ended",
    html: emailLayout({
      title,
      preheader: "Your vehicles remain saved should you wish to return.",
      body,
      footerNote: "You are receiving this email because your Launch Pad membership has ended.",
    }),
  };
}

export async function sendSubscriptionCancelledEmail({
  to,
  ...params
}: SubscriptionCancelledEmailParams & { to: string }) {
  await sendBuilt(to, buildSubscriptionCancelledEmail(params), "cancelled");
}

// ─────────────────────────────────────────────────────────────
// 5. FAMILY VEHICLE ADDED
// ─────────────────────────────────────────────────────────────
export interface FamilyVehicleAddedEmailParams {
  name: string;
  licensePlate: string;
  newTotal: number; // in dollars
  billingCycle: string; // "month" | "year"
  /** 0 on commercial plans, where additional vehicles bill at full price. */
  discountPercent?: number;
}

export function buildFamilyVehicleAddedEmail({
  name,
  licensePlate,
  newTotal,
  billingCycle,
  discountPercent = 35,
}: FamilyVehicleAddedEmailParams): BuiltEmail {
  const isDiscounted = discountPercent > 0;
  const title = "Vehicle added";

  const body = [
    heading(title),
    salutation(name),
    paragraph(
      `You have added ${plate(licensePlate)} to your membership${
        isDiscounted ? ` at ${discountPercent}% off, every ${text(billingCycle)}, with no expiry.` : " at the full plan rate."
      }`,
    ),
    details(
      [
        ["Vehicle", plate(licensePlate)],
        ["New recurring total", recurringTotal(newTotal, billingCycle)],
      ],
      { emphasizeLast: true },
    ),
    button(BILLING_URL, "View billing"),
    signoff(),
  ].join("\n");

  return {
    subject: isDiscounted
      ? `${licensePlate} added to your subscription — ${discountPercent}% off`
      : `${licensePlate} added to your subscription`,
    html: emailLayout({
      title,
      preheader: `${licensePlate} is now on your membership.`,
      body,
      footerNote: MEMBER_FOOTER,
    }),
  };
}

export async function sendFamilyVehicleAddedEmail({
  to,
  ...params
}: FamilyVehicleAddedEmailParams & { to: string }) {
  await sendBuilt(to, buildFamilyVehicleAddedEmail(params), "family vehicle added");
}

// ─────────────────────────────────────────────────────────────
// 6. FAMILY VEHICLE REMOVED
// ─────────────────────────────────────────────────────────────
export interface FamilyVehicleRemovedEmailParams {
  name: string;
  licensePlate: string;
  newTotal: number; // in dollars
  billingCycle: string;
}

export function buildFamilyVehicleRemovedEmail({
  name,
  licensePlate,
  newTotal,
  billingCycle,
}: FamilyVehicleRemovedEmailParams): BuiltEmail {
  const title = "Vehicle unsubscribed";

  const body = [
    heading(title),
    salutation(name),
    paragraph(
      `${plate(licensePlate)} has been unsubscribed from your membership. Your other vehicles keep their current pricing.`,
    ),
    details(
      [
        ["Unsubscribed", plate(licensePlate)],
        ["New recurring total", recurringTotal(newTotal, billingCycle)],
      ],
      { emphasizeLast: true },
    ),
    notice("A prorated credit for the current period has been applied automatically.", "ok"),
    button(BILLING_URL, "View billing"),
    signoff(),
  ].join("\n");

  return {
    subject: `${licensePlate} unsubscribed from your family plan`,
    html: emailLayout({
      title,
      preheader: `${licensePlate} is off your membership. Your new total is ${money(newTotal)}/${billingCycle}.`,
      body,
      footerNote: MEMBER_FOOTER,
    }),
  };
}

export async function sendFamilyVehicleRemovedEmail({
  to,
  ...params
}: FamilyVehicleRemovedEmailParams & { to: string }) {
  await sendBuilt(to, buildFamilyVehicleRemovedEmail(params), "family vehicle removed");
}

// ─────────────────────────────────────────────────────────────
// 7. PRIMARY VEHICLE SWAPPED
// ─────────────────────────────────────────────────────────────
export interface PrimaryVehicleSwappedEmailParams {
  name: string;
  oldPrimaryLabel: string;
  newPrimaryLabel: string;
  newTotal: number; // in dollars
  billingCycle: string;
}

export function buildPrimaryVehicleSwappedEmail({
  name,
  oldPrimaryLabel,
  newPrimaryLabel,
  newTotal,
  billingCycle,
}: PrimaryVehicleSwappedEmailParams): BuiltEmail {
  const title = "Your primary vehicle changed";

  const body = [
    heading(title),
    salutation(name),
    paragraph(
      `You unsubscribed <strong>${text(oldPrimaryLabel)}</strong>, your primary vehicle. Since you still have other vehicles on your membership, <strong>${text(newPrimaryLabel)}</strong> is now your primary vehicle. It bills at the full plan rate and anchors the family discount for your other vehicles.`,
    ),
    details(
      [
        ["Unsubscribed", text(oldPrimaryLabel)],
        ["New primary vehicle", text(newPrimaryLabel)],
        ["New recurring total", recurringTotal(newTotal, billingCycle)],
      ],
      { emphasizeLast: true },
    ),
    button(BILLING_URL, "View billing"),
    signoff(),
  ].join("\n");

  return {
    subject: `Your primary vehicle is now ${newPrimaryLabel}`,
    html: emailLayout({
      title,
      preheader: `${newPrimaryLabel} is now your primary vehicle.`,
      body,
      footerNote: MEMBER_FOOTER,
    }),
  };
}

export async function sendPrimaryVehicleSwappedEmail({
  to,
  ...params
}: PrimaryVehicleSwappedEmailParams & { to: string }) {
  await sendBuilt(to, buildPrimaryVehicleSwappedEmail(params), "primary vehicle swapped");
}
