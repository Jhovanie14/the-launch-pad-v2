import { describe, expect, it } from "vitest";
import { buildFleetInvoiceEmail } from "./fleet-invoice-email";

const EVIL = `<img src=x onerror=alert(1)>`;

describe("buildFleetInvoiceEmail", () => {
  const params = {
    companyName: EVIL,
    invoiceNumber: "INV-0042",
    amount: 1250,
    dueDate: "2026-12-01",
    hostedInvoiceUrl: "https://invoice.stripe.com/i/acct_1/test_123",
  };

  it("escapes the company name and shows the invoice facts", () => {
    const { subject, html } = buildFleetInvoiceEmail(params);
    expect(html).not.toContain("<img src=x");
    expect(subject).toContain("INV-0042");
    expect(html).toContain("$1250.00");
    expect(html).toContain("December 1, 2026"); // date-only string never slips a day
  });

  it("has no emoji and exactly one flame button to the hosted invoice", () => {
    const { subject, html } = buildFleetInvoiceEmail(params);
    expect(subject + html).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(html.match(/background:#fec92f/g)).toHaveLength(1);
    expect(html).toContain('href="https://invoice.stripe.com/i/acct_1/test_123"');
  });

  it("has no button when there is no hosted invoice link", () => {
    const { html } = buildFleetInvoiceEmail({ ...params, hostedInvoiceUrl: null });
    expect(html).not.toContain("background:#fec92f");
    expect(html).not.toContain('href="null"');
  });
});
