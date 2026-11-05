import { Resend } from "resend";
import {
  FLOCK_DISCOUNT_RATE,
  MAX_VEHICLES_PER_SUBSCRIPTION,
} from "@/lib/pricing/flockPricing";
import {
  FROM,
  SITE_URL,
  button,
  details,
  emailLayout,
  heading,
  list,
  money,
  notice,
  paragraph,
  plate,
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
const MEMBER_FOOTER = "You're getting this because you have a Launch Pad membership.";

export interface BuiltEmail {
  subject: string;
  html: string;
}

function greeting(name: string): string {
  return paragraph(`Hi ${text(name)},`);
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
  const title = isRenewal ? "Your membership renewed" : "Welcome to The Launch Pad";
  const subject = isRenewal
    ? `Your subscription has been renewed — ${money(amountPaid)} charged`
    : "Payment confirmed — welcome to The Launch Pad!";

  const body = [
    heading(title),
    greeting(name),
    paragraph(
      isRenewal
        ? "Your membership renewed and your payment went through. Here's the summary."
        : "Thanks for joining. Your first payment went through and your membership is active. Here's your receipt.",
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
    paragraph("Thanks for being a member."),
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
  const title = isLastAttempt ? "Final notice: your payment failed" : "Your payment didn't go through";
  const subject = isLastAttempt
    ? "Final notice: Your subscription will be cancelled — update your card now"
    : "Action needed: Your payment failed — update your card";

  const body = [
    heading(title),
    greeting(name),
    paragraph(
      "We tried to charge your card for your membership, but the payment didn't go through. Update your payment method to keep your membership active.",
    ),
    notice(
      isLastAttempt
        ? "<strong>This was our last try.</strong> Please update your card today, or your membership will be cancelled."
        : "<strong>Nothing is lost yet.</strong> Update your card soon to keep your membership running.",
      isLastAttempt ? "danger" : "warn",
    ),
    paragraph("If the payment can't go through:"),
    list([
      "Your membership will be suspended after the retries fail",
      "You'll lose unlimited express washes",
      "Family pricing on your other vehicles will end",
    ]),
    button(BILLING_URL, "Update payment method"),
    paragraph(
      "It takes less than a minute, and your membership picks up as soon as a charge succeeds.",
      { muted: true, small: true },
    ),
    paragraph(
      `Questions? Reply to this email or <a href="${text(`${SITE_URL}/contact`)}">contact us</a>. We're happy to help.`,
    ),
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
  const title = "We'll miss you";

  const body = [
    heading(title),
    greeting(name),
    paragraph(
      `You asked to cancel your membership. That's completely fine, and you keep full access until <strong>${text(periodEndDate)}</strong>.`,
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
      "Changed your mind? You can keep your membership with one click. No re-enrolling, and your vehicles stay linked.",
    ),
    button(BILLING_URL, "Keep my membership"),
    paragraph(
      `You can reactivate from your billing page any time before ${text(periodEndDate)}.`,
      { muted: true, small: true },
    ),
    paragraph(
      "If there's something we could have done better, we'd really like to hear it. Just reply to this email.",
    ),
    signoff(),
  ].join("\n");

  return {
    subject: `Your plan ends ${periodEndDate} — keep your subscription active`,
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
    greeting(name),
    paragraph(
      "Your membership has officially ended. Thank you for the time you spent with us. It was great having you.",
    ),
    subheading("Waiting for you if you come back"),
    list([
      "<strong>Unlimited washes</strong>: keep your car clean every week",
      "<strong>Save over pay-per-wash</strong>: members save an average of $40 a month",
      `<strong>Family pricing</strong>: add up to ${MAX_VEHICLES_PER_SUBSCRIPTION - 1} more vehicles, up to ${FAMILY_DISCOUNT_PERCENT}% off`,
      "<strong>Priority service</strong>: no waiting in the regular line",
    ]),
    paragraph(
      "Rejoining takes under a minute. Your vehicles and history are still saved, so just pick a plan and you're back in.",
    ),
    button(plansUrl, "See plans and rejoin"),
    paragraph("No contract. Cancel anytime, just like before.", { muted: true, small: true }),
    paragraph(
      "If something could have been better, we'd love to know. Reply to this email and a real person will read it.",
    ),
    signoff(),
  ].join("\n");

  return {
    subject: "Your Launch Pad subscription has ended — come back anytime",
    html: emailLayout({
      title,
      preheader: "Your vehicles are still saved if you want to come back.",
      body,
      footerNote: "You're getting this because your Launch Pad membership just ended.",
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
    greeting(name),
    paragraph(
      `You've added ${plate(licensePlate)} to your membership${
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
    greeting(name),
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
    greeting(name),
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
