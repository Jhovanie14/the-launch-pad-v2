import { describe, expect, it } from "vitest";
import {
  buildProductOrderConfirmationEmail,
  buildProductOrderOutForDeliveryEmail,
  buildProductOrderReadyForPickupEmail,
  buildProductOrderRefundedEmail,
  orderItemsRowsHtml,
} from "./product-order-emails";

const EVIL = `<img src=x onerror=alert(1)>`;
const EMOJI = /\p{Extended_Pictographic}/u;
const FLAME_BUTTON = /background:#fec92f/g;

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
};

describe.each(Object.entries(builders))("%s email", (_name, build) => {
  const { subject, html } = build();

  it("escapes the customer's name and product names", () => {
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("has no emoji in subject or body", () => {
    expect(subject).not.toMatch(EMOJI);
    expect(html).not.toMatch(EMOJI);
  });

  it("has exactly one primary flame button", () => {
    expect(html.match(FLAME_BUTTON)).toHaveLength(1);
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
