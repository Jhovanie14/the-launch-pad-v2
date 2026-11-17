import { describe, expect, it, vi } from "vitest";

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn(async () => ({ error: null })) };
  },
}));

import {
  buildCancellationScheduledEmail,
  buildFamilyVehicleAddedEmail,
  buildFamilyVehicleRemovedEmail,
  buildPaymentFailedEmail,
  buildPrimaryVehicleSwappedEmail,
  buildSubscriptionCancelledEmail,
  buildSubscriptionInvoiceEmail,
  type BuiltEmail,
} from "./subscription-emails";

const EVIL = '<img src=x onerror="alert(1)">';

describe("member welcome (first payment): formal wording", () => {
  const welcome = buildSubscriptionInvoiceEmail({
    name: "James Carter",
    amountPaid: 39.99,
    billingPeriodStart: "June 1, 2025",
    billingPeriodEnd: "June 30, 2025",
    invoiceUrl: null,
    isRenewal: false,
  });

  it("has a formal subject without exclamation marks", () => {
    expect(welcome.subject).toBe("Welcome to The Launch Pad: your membership is active");
  });

  it("addresses them by first name and welcomes them as a member", () => {
    expect(welcome.html).toContain("Dear James,");
    expect(welcome.html).toContain("Thank you for becoming a member");
    expect(welcome.html).toContain("Kind regards,<br>The Launch Pad");
  });
});

const cases: Array<[string, (name: string) => BuiltEmail]> = [
  [
    "invoice (with invoice url)",
    (name) =>
      buildSubscriptionInvoiceEmail({
        name,
        amountPaid: 39.99,
        billingPeriodStart: EVIL,
        billingPeriodEnd: "June 30, 2025",
        invoiceUrl: "https://invoice.stripe.com/i/abc",
        isRenewal: true,
      }),
  ],
  [
    "invoice (no invoice url)",
    (name) =>
      buildSubscriptionInvoiceEmail({
        name,
        amountPaid: 39.99,
        billingPeriodStart: "June 1, 2025",
        billingPeriodEnd: "June 30, 2025",
        invoiceUrl: null,
        isRenewal: false,
      }),
  ],
  ["payment failed", (name) => buildPaymentFailedEmail({ name, attemptCount: 1 })],
  ["payment failed (final)", (name) => buildPaymentFailedEmail({ name, attemptCount: 3 })],
  ["cancellation scheduled", (name) => buildCancellationScheduledEmail({ name, periodEndDate: EVIL })],
  ["cancelled", (name) => buildSubscriptionCancelledEmail({ name })],
  [
    "vehicle added",
    (name) =>
      buildFamilyVehicleAddedEmail({ name, licensePlate: EVIL, newTotal: 64.99, billingCycle: "month" }),
  ],
  [
    "vehicle added (commercial)",
    (name) =>
      buildFamilyVehicleAddedEmail({
        name,
        licensePlate: "ABC123",
        newTotal: 80,
        billingCycle: EVIL,
        discountPercent: 0,
      }),
  ],
  [
    "vehicle removed",
    (name) =>
      buildFamilyVehicleRemovedEmail({ name, licensePlate: EVIL, newTotal: 39.99, billingCycle: "month" }),
  ],
  [
    "primary swapped",
    (name) =>
      buildPrimaryVehicleSwappedEmail({
        name,
        oldPrimaryLabel: EVIL,
        newPrimaryLabel: EVIL,
        newTotal: 39.99,
        billingCycle: "month",
      }),
  ],
];

describe.each(cases)("%s email", (_label, build) => {
  const email = build(EVIL);

  it("escapes every dynamic value", () => {
    expect(email.html).not.toContain("<img src=x");
    // Formal emails greet by first name only ("Dear <first word>,"), so check the escaped start.
    expect(email.html).toContain("&lt;img");
  });

  it("contains no emoji", () => {
    expect(email.subject).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(email.html).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("has exactly one primary navy button and one h1", () => {
    expect(email.html.match(/background:#041335;color:#ffffff;/g)).toHaveLength(1);
    expect(email.html.match(/<h1/g)).toHaveLength(1);
  });

  // Sent from noreply@, so a reply goes nowhere.
  it("never asks the customer to reply", () => {
    expect(email.html).not.toMatch(/reply to this email|just reply/i);
  });
});

describe("subscription cancelled email", () => {
  it("quotes the real starting plan price, not an unverified saving", () => {
    const { html } = buildSubscriptionCancelledEmail({ name: "Sam" });
    expect(html).not.toContain("$40");
    expect(html).toContain("$39.99");
  });
});

describe("invoice email", () => {
  it("links the Stripe invoice as the primary action when present", () => {
    const { html } = cases[0][1]("Ana");
    expect(html).toContain('href="https://invoice.stripe.com/i/abc" style="background:#041335;color:#ffffff;');
  });

  it("keeps the subject meaning without emoji", () => {
    expect(cases[0][1]("Ana").subject).toBe("Your membership has renewed: $39.99 charged");
  });
});
