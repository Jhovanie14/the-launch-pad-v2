import { describe, expect, it } from "vitest";
import { buildLineItemUnitAmounts } from "./lineItems";
import {
  HOLIDAY_SALE_ACTIVE,
  HOLIDAY_SALE_DISCOUNT,
} from "@/lib/booking/holidaySale";

const sale = (n: number) =>
  HOLIDAY_SALE_ACTIVE ? n * (1 - HOLIDAY_SALE_DISCOUNT) : n;

describe("buildLineItemUnitAmounts", () => {
  it("applies the holiday sale to raw add-on prices (service price arrives pre-discounted)", () => {
    const r = buildLineItemUnitAmounts({
      servicePrice: sale(50), // computeBookingAmount already discounted it
      addOnPrices: [10, 5],
      discountFactor: 1,
    });
    expect(r.serviceCents).toBe(Math.round(sale(50) * 100));
    expect(r.addOnCents).toEqual([
      Math.round(sale(10) * 100),
      Math.round(sale(5) * 100),
    ]);
  });

  it("distributes a promo discount factor across all line items", () => {
    const r = buildLineItemUnitAmounts({
      servicePrice: 100,
      addOnPrices: [10],
      discountFactor: 0.9,
    });
    expect(r.serviceCents).toBe(9000);
    expect(r.addOnCents).toEqual([Math.round(sale(10) * 100 * 0.9)]);
  });

  it("line items sum to the authoritative charged amount", () => {
    const servicePrice = sale(50);
    const addOnPrices = [10, 5];
    const chargedCents = Math.round((servicePrice + sale(10) + sale(5)) * 100);
    const r = buildLineItemUnitAmounts({
      servicePrice,
      addOnPrices,
      discountFactor: 1,
    });
    const sum = r.serviceCents + r.addOnCents.reduce((a, b) => a + b, 0);
    expect(sum).toBe(chargedCents);
  });
});
