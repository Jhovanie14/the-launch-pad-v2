import { describe, expect, it } from "vitest";
import {
  buildProductOrderCollectedEmail,
  buildProductOrderConfirmationEmail,
  buildProductOrderHoldReminderEmail,
  buildProductOrderOutForDeliveryEmail,
  buildProductOrderReadyForPickupEmail,
  buildProductOrderRefundedEmail,
  buildProductOrderReleasedEmail,
  buildProductOrderReservedEmail,
  orderItemsRowsHtml,
} from "./product-order-emails";

const EVIL = `<img src=x onerror=alert(1)>`;
const EMOJI = /\p{Extended_Pictographic}/u;
const PRIMARY_BUTTON = /background:#041335;color:#ffffff;/g;

describe("orderItemsRowsHtml", () => {
  it("renders one row per item with quantity and line total", () => {
    const html = orderItemsRowsHtml([
      { name: "Tire Shine Pro", quantity: 2, unit_price: 19.99 },
      { name: "Ceramic Wax", quantity: 1, unit_price: 39.99 },
    ]);
    expect(html).toContain("Tire Shine Pro");
    expect(html).toContain("&times;2"); // quantity marker (HTML entity for email clients)
    expect(html).toContain("$39.98"); // 2 x 19.99
    expect(html).toContain("$39.99");
  });

  it("escapes HTML in product names", () => {
    const html = orderItemsRowsHtml([
      { name: `<img src=x onerror=alert(1)>`, quantity: 1, unit_price: 5 },
    ]);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

const orderId = "1a2b3c4d-0000-4000-8000-000000000000";
const builders = {
  confirmation: () =>
    buildProductOrderConfirmationEmail({
      to: "x@example.com",
      name: EVIL,
      orderId,
      items: [{ name: EVIL, quantity: 2, unit_price: 19.99 }],
      subtotal: 39.98,
      deliveryFee: 5,
      total: 44.98,
      fulfillmentMethod: "delivery",
    }),
  readyForPickup: () => buildProductOrderReadyForPickupEmail({ to: "x@example.com", name: EVIL, orderId }),
  outForDelivery: () => buildProductOrderOutForDeliveryEmail({ to: "x@example.com", name: EVIL, orderId }),
  refunded: () => buildProductOrderRefundedEmail({ to: "x@example.com", name: EVIL, orderId, total: 44.98 }),
  reserved: () =>
    buildProductOrderReservedEmail({ to: "x@example.com", name: EVIL, orderId, items: [{ name: EVIL, quantity: 1, unit_price: 25.2 }], subtotal: 25.2, total: 25.2, pickupHours: null }),
  reminder: () =>
    buildProductOrderHoldReminderEmail({ to: "x@example.com", name: EVIL, orderId, total: 25.2, holdDate: "Thu, Nov 26", pickupHours: null }),
  released: () => buildProductOrderReleasedEmail({ to: "x@example.com", name: EVIL, orderId, byCustomer: false }),
  collected: () =>
    buildProductOrderCollectedEmail({ to: "x@example.com", name: EVIL, orderId, items: [{ name: EVIL, quantity: 1, unit_price: 25.2 }], total: 25.2, paidVia: "cash" }),
};

describe.each(Object.entries(builders))("%s email", (_name, build) => {
  const { subject, html } = build();

  it("escapes the customer's name and product names", () => {
    expect(html).not.toContain("<img src=x");
    // The greeting uses the first name only ("Dear <first word>,"), so check the escaped start.
    expect(html).toContain("&lt;img");
  });

  it("has no emoji in subject or body", () => {
    expect(subject).not.toMatch(EMOJI);
    expect(html).not.toMatch(EMOJI);
  });

  it("has exactly one primary navy button", () => {
    expect(html.match(PRIMARY_BUTTON)).toHaveLength(1);
  });

  it("uses the short order number the dashboard shows", () => {
    expect(subject).toContain("1A2B3C4D");
    expect(html).toContain("1A2B3C4D");
  });
});

describe("confirmation email order table", () => {
  it("is a data table with column headers and totals", () => {
    const { html } = builders.confirmation();
    expect(html.match(/<th scope="col"/g)).toHaveLength(3);
    expect(html).toContain("Delivery fee");
    expect(html).toContain("$44.98");
  });

  it("omits the delivery fee row for pickup", () => {
    const { html } = buildProductOrderConfirmationEmail({
      to: "x@example.com",
      name: "Sam",
      orderId,
      items: [{ name: "Wax", quantity: 1, unit_price: 10 }],
      subtotal: 10,
      deliveryFee: 0,
      total: 10,
      fulfillmentMethod: "pickup",
    });
    expect(html).not.toContain("Delivery fee");
    expect(html).toContain("ready for pickup");
  });
});

describe("pickup emails", () => {
  const items = [{ name: "Wheel brush", quantity: 1, unit_price: 25.2 }];
  it("reserved: pay at the counter, we email when ready", () => {
    const { subject, html } = buildProductOrderReservedEmail({ to: "x@example.com", name: "Dee", orderId, items, subtotal: 25.2, total: 25.2, pickupHours: "Thu–Sun, 9:30 AM–6:30 PM" });
    expect(subject).toContain("reserved");
    expect(html).toContain("pay $25.20 at the counter when you collect");
    expect(html).toContain("We will email you when it is ready");
    expect(html).toContain("Thu–Sun, 9:30 AM–6:30 PM");
  });
  it("no hours line when pickup hours are not set", () => {
    const { html } = buildProductOrderReservedEmail({ to: "x@example.com", name: "Dee", orderId, items, subtotal: 25.2, total: 25.2, pickupHours: null });
    expect(html).not.toContain("Pickup hours");
    expect(buildProductOrderReadyForPickupEmail({ to: "x@example.com", name: "Dee", orderId }).html).not.toContain("Pickup hours");
  });
  it("ready for an unpaid reservation shows the amount due and the hold date", () => {
    const { html } = buildProductOrderReadyForPickupEmail({ to: "x@example.com", name: "Dee", orderId, amountDue: 25.2, holdDate: "Thu, Nov 26", pickupHours: "Daily 9–6" });
    expect(html).toContain("Show reference");
    expect(html).toContain("$25.20 to pay at the counter (cash, card or Zelle)");
    expect(html).not.toContain("or QR");
    expect(html).toContain("until Thu, Nov 26");
    expect(html).toContain("Daily 9–6");
  });
  it("ready for a paid order has nothing to pay", () => {
    const { html } = buildProductOrderReadyForPickupEmail({ to: "x@example.com", name: "Dee", orderId, amountDue: null, holdDate: null, pickupHours: null });
    expect(html).not.toContain("to pay at the counter");
  });
  it("reminder names the hold date", () => {
    const { html } = buildProductOrderHoldReminderEmail({ to: "x@example.com", name: "Dee", orderId, total: 25.2, holdDate: "Thu, Nov 26", pickupHours: null });
    expect(html).toContain("held until tomorrow, Thu, Nov 26");
  });
  it("released says nothing was charged, worded for who released it", () => {
    expect(buildProductOrderReleasedEmail({ to: "x@example.com", name: "Dee", orderId, byCustomer: false }).html).toContain("released your reservation. Nothing was charged.");
    expect(buildProductOrderReleasedEmail({ to: "x@example.com", name: "Dee", orderId, byCustomer: true }).html).toContain("You cancelled reservation 1A2B3C4D. Nothing was charged.");
  });
  it("collected is a receipt with how they paid", () => {
    const { html } = buildProductOrderCollectedEmail({ to: "x@example.com", name: "Dee", orderId, items, total: 25.2, paidVia: "card_reader" });
    expect(html).toContain("Card reader");
    expect(html).toContain("$25.20");
  });
  it("refunded wording for card and store", () => {
    expect(buildProductOrderRefundedEmail({ to: "x@example.com", name: "Dee", orderId, total: 10 }).html).toContain("to the card you paid with");
    const store = buildProductOrderRefundedEmail({ to: "x@example.com", name: "Dee", orderId, total: 10, where: "store" }).html;
    expect(store).toContain("refunded your order at the store");
    expect(store).not.toContain("business days");
  });
});
