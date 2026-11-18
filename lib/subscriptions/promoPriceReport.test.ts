import { describe, expect, it } from "vitest";
import { promoPriceRows, promoPriceCsv } from "./promoPriceReport";

const sub = (over: any = {}) => ({
  id: "sub_1",
  status: "active",
  customer: { email: "sam@example.com", name: "Sam Lee" },
  items: {
    data: [
      { price: { id: "price_promo", unit_amount: 4499, currency: "usd", recurring: { interval: "month" }, metadata: { is_promo_discount: "true" } } },
      { price: { id: "price_family", unit_amount: 3249, currency: "usd", recurring: { interval: "month" }, metadata: { vehicle_index: "1" } } },
    ],
  },
  ...over,
});

describe("promoPriceRows", () => {
  it("lists a live membership still on the old permanent offer price", () => {
    expect(promoPriceRows([sub()], { sub_1: "Sam Lee" })).toEqual([
      {
        stripeSubscriptionId: "sub_1",
        status: "active",
        customer: "Sam Lee",
        email: "sam@example.com",
        interval: "month",
        paysNowCents: 4499,
        fullPriceCents: 4999,
        differenceCents: 500,
      },
    ]);
  });

  it("skips memberships without the offer price, and ended ones", () => {
    const plain = sub({ items: { data: [{ price: { id: "p", unit_amount: 4999, currency: "usd", recurring: { interval: "month" }, metadata: {} } }] } });
    expect(promoPriceRows([plain, sub({ status: "canceled" })], {})).toEqual([]);
  });

  it("falls back to the Stripe customer name when there is no profile", () => {
    expect(promoPriceRows([sub()], {})[0].customer).toBe("Sam Lee");
  });
});

describe("promoPriceCsv", () => {
  it("writes a header and one quoted line per member, in dollars", () => {
    const csv = promoPriceCsv(promoPriceRows([sub()], { sub_1: 'Sam "Sammy" Lee' }));
    expect(csv.split("\n")).toEqual([
      "customer,email,status,billing,pays_now,full_price,difference,stripe_subscription",
      '"Sam ""Sammy"" Lee","sam@example.com","active","month","44.99","49.99","5.00","sub_1"',
    ]);
  });
});
