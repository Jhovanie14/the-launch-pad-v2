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
    expect(email.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("contains no emoji", () => {
    expect(email.subject).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(email.html).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("has exactly one primary flame button and one h1", () => {
    expect(email.html.match(/background:#fec92f/g)).toHaveLength(1);
    expect(email.html.match(/<h1/g)).toHaveLength(1);
  });
});

describe("invoice email", () => {
  it("links the Stripe invoice as the primary action when present", () => {
    const { html } = cases[0][1]("Ana");
    expect(html).toContain('href="https://invoice.stripe.com/i/abc" style="background:#fec92f');
  });

  it("keeps the subject meaning without emoji", () => {
    expect(cases[0][1]("Ana").subject).toBe("Your subscription has been renewed — $39.99 charged");
  });
});
