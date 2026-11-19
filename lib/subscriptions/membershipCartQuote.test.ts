import { describe, expect, it } from "vitest";
import { formatCents, membershipCartQuote } from "./membershipCartQuote";

const express = { name: "Express Detail", is_commercial: false, monthly_price: 59.99, yearly_price: 647.89 };

describe("membershipCartQuote", () => {
  it("monthly, 2 cars, first membership → $92.98 first month, then $98.98", () => {
    const q = membershipCartQuote({ plan: express, billing: "monthly", carCount: 2, offerEligible: true });
    expect(q.cars.map((c) => c.cents)).toEqual([5999, 3899]);
    expect(q.cars.map((c) => c.primary)).toEqual([true, false]);
    expect(q.offerCents).toBe(600);
    expect(q.offerPercent).toBe(10);
    expect(q.hasOffer).toBe(true);
    expect(q.firstCents).toBe(9298);
    expect(q.renewalCents).toBe(9898);
    expect(q.period).toBe("month");
    expect(q.periodShort).toBe("/mo");
    expect(q.discountPercent).toBe(35);
    expect(q.extraCarSavingCents).toBe(2100);
    expect(q.isCommercial).toBe(false);
  });

  it("yearly uses the yearly price and year words", () => {
    const q = membershipCartQuote({ plan: express, billing: "yearly", carCount: 1, offerEligible: true });
    expect(q.cars.map((c) => c.cents)).toEqual([64789]);
    expect(q.offerCents).toBe(6479);
    expect(q.period).toBe("year");
    expect(q.periodShort).toBe("/yr");
  });

  it("returning member → no offer, one total", () => {
    const q = membershipCartQuote({ plan: express, billing: "monthly", carCount: 2, offerEligible: false });
    expect(q.offerCents).toBe(0);
    expect(q.offerPercent).toBe(0);
    expect(q.hasOffer).toBe(false);
    expect(q.firstCents).toBe(q.renewalCents);
  });

  it("commercial plan → extras at full price, no discount", () => {
    const q = membershipCartQuote({
      plan: { name: "Commercial Wash", is_commercial: true, monthly_price: 89.99, yearly_price: 971.88 },
      billing: "monthly",
      carCount: 3,
      offerEligible: false,
    });
    expect(q.cars.map((c) => c.cents)).toEqual([8999, 8999, 8999]);
    expect(q.discountPercent).toBe(0);
    expect(q.extraCarSavingCents).toBe(0);
    expect(q.isCommercial).toBe(true);
  });

  it("commercial by name when the column is null", () => {
    const q = membershipCartQuote({
      plan: { name: "Commercial Wash", is_commercial: null, monthly_price: 89.99, yearly_price: 971.88 },
      billing: "monthly",
      carCount: 1,
      offerEligible: false,
    });
    expect(q.isCommercial).toBe(true);
  });

  it("car count is clamped to 1..5", () => {
    expect(membershipCartQuote({ plan: express, billing: "monthly", carCount: 0, offerEligible: false }).cars).toHaveLength(1);
    expect(membershipCartQuote({ plan: express, billing: "monthly", carCount: 9, offerEligible: false }).cars).toHaveLength(5);
  });

  it("formatCents", () => {
    expect(formatCents(9298)).toBe("$92.98");
    expect(formatCents(600)).toBe("$6.00");
  });
});
