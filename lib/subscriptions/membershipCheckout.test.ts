import { describe, expect, it } from "vitest";
import { firstPeriodDiscountCents, parseMembershipCheckout } from "./membershipCheckout";

describe("parseMembershipCheckout", () => {
  const ok = { planId: "p1", billingCycle: "monthly", vehicles: [{ license_plate: "abc 1234" }] };

  it("accepts a plan, a cycle and one to five cars, with plates tidied", () => {
    const r = parseMembershipCheckout(ok);
    expect(r).toEqual({ ok: true, value: { planId: "p1", billingCycle: "monthly", plates: ["ABC 1234"] } });
  });

  it("accepts the older single-vehicle shape", () => {
    const r = parseMembershipCheckout({ planId: "p1", billingCycle: "yearly", vehicle: { license_plate: "XY1" } });
    expect(r.ok && r.value.plates).toEqual(["XY1"]);
  });

  it.each([
    ["no plan", { ...ok, planId: "" }],
    ["an unknown billing cycle", { ...ok, billingCycle: "weekly" }],
    ["no cars", { ...ok, vehicles: [] }],
    ["more than five cars", { ...ok, vehicles: Array.from({ length: 6 }, (_, i) => ({ license_plate: `CAR${i}` })) }],
    ["a missing plate", { ...ok, vehicles: [{ license_plate: "" }] }],
    ["a plate with symbols", { ...ok, vehicles: [{ license_plate: "AB$12" }] }],
    ["the same car twice, however it is typed", { ...ok, vehicles: [{ license_plate: "ABC 123" }, { license_plate: "abc-123" }] }],
    ["no body at all", null],
  ])("refuses %s", (_label, body) => {
    expect(parseMembershipCheckout(body).ok).toBe(false);
  });
});

describe("firstPeriodDiscountCents", () => {
  const promo = { enabled: true, percent: 10 };

  it("is the offer's share of the primary car's price for a first-time member", () => {
    expect(firstPeriodDiscountCents({ hadMembershipBefore: false, promo, primaryCarCents: 4999 })).toBe(500);
    expect(firstPeriodDiscountCents({ hadMembershipBefore: false, promo, primaryCarCents: 13197 })).toBe(1320);
  });

  it("is nothing for a returning member, when the offer is off, or with no price", () => {
    expect(firstPeriodDiscountCents({ hadMembershipBefore: true, promo, primaryCarCents: 4999 })).toBe(0);
    expect(firstPeriodDiscountCents({ hadMembershipBefore: false, promo: { enabled: false, percent: 10 }, primaryCarCents: 4999 })).toBe(0);
    expect(firstPeriodDiscountCents({ hadMembershipBefore: false, promo, primaryCarCents: 0 })).toBe(0);
  });
});
