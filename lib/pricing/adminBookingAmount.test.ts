import { describe, expect, it } from "vitest";
import {
  computeAdminBookingAmount,
  PLAN_NOT_COVERED_MESSAGE,
} from "./adminBookingAmount";
import {
  HOLIDAY_SALE_ACTIVE,
  HOLIDAY_SALE_DISCOUNT,
} from "@/lib/booking/holidaySale";

const sale = (n: number) =>
  Number((HOLIDAY_SALE_ACTIVE ? n * (1 - HOLIDAY_SALE_DISCOUNT) : n).toFixed(2));

/** Minimal fake Supabase that resolves table reads from a fixture map. */
function fakeDb(fixtures: {
  service?: any;
  addOns?: any[];
  subscription?: any;
  plan?: any;
  promo?: any;
}) {
  return {
    from(table: string) {
      const api: any = {
        select: () => api,
        eq: () => api,
        in: () => api,
        ilike: () => api,
        maybeSingle: async () => {
          if (table === "service_packages") return { data: fixtures.service ?? null };
          if (table === "user_subscription") return { data: fixtures.subscription ?? null };
          if (table === "subscription_plans") return { data: fixtures.plan ?? null };
          if (table === "promo_codes") return { data: fixtures.promo ?? null };
          return { data: null };
        },
      };
      if (table === "add_ons") {
        return { select: () => ({ in: async () => ({ data: fixtures.addOns ?? [] }) }) };
      }
      return api;
    },
  } as any;
}

const quickPlanMember = {
  subscription: { id: "sub1", subscription_plan_id: "p1", status: "active" },
  plan: { id: "p1", name: "Quick Service Plan" },
};

describe("computeAdminBookingAmount", () => {
  it("books a covered service for a subscriber at $0", async () => {
    const db = fakeDb({
      service: { id: "s1", price: 30, category: "quick service" },
      ...quickPlanMember,
    });
    const result = await computeAdminBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: [],
      subscriberId: "u1",
      paymentMethod: "subscription",
    });
    expect(result).toEqual({ servicePrice: 0, total: 0, promoId: null });
  });

  it("refuses to book an uncovered service as free", async () => {
    const db = fakeDb({
      service: { id: "s2", price: 80, category: "express detail" },
      ...quickPlanMember,
    });
    await expect(
      computeAdminBookingAmount(db, {
        servicePackageId: "s2",
        addOnIds: [],
        subscriberId: "u1",
        paymentMethod: "subscription",
      })
    ).rejects.toThrow(PLAN_NOT_COVERED_MESSAGE);
  });

  it("charges a Quick plan member for an Express Detail paid in cash", async () => {
    const db = fakeDb({
      service: { id: "s2", price: 80, category: "express detail" },
      ...quickPlanMember,
    });
    const result = await computeAdminBookingAmount(db, {
      servicePackageId: "s2",
      addOnIds: [],
      subscriberId: "u1",
      paymentMethod: "cash",
    });
    expect(result.total).toBe(sale(80));
  });

  it("charges only add-ons when the plan covers the service", async () => {
    const db = fakeDb({
      service: { id: "s1", price: 30, category: "quick service" },
      addOns: [{ id: "a1", price: 10 }],
      ...quickPlanMember,
    });
    const result = await computeAdminBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: ["a1"],
      subscriberId: "u1",
      paymentMethod: "cash",
    });
    expect(result).toEqual({ servicePrice: 0, total: sale(10), promoId: null });
  });

  it("lets an admin take cash from a customer with no account", async () => {
    const db = fakeDb({ service: { id: "s1", price: 30, category: "quick service" } });
    const result = await computeAdminBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: [],
      subscriberId: null,
      paymentMethod: "cash",
    });
    expect(result).toEqual({ servicePrice: sale(30), total: sale(30), promoId: null });
  });

  const promo = {
    id: 7, is_active: true, applies_to: "one_time", max_uses: null,
    used_count: 0, restricted_to_service: null, discount_percent: 0,
    discount_amount: 0,
  };

  it("applies a percent promo code after the sale", async () => {
    const db = fakeDb({
      service: { id: "s1", price: 40, category: "quick service" },
      promo: { ...promo, discount_type: "percent", discount_percent: 25 },
    });
    const result = await computeAdminBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: [],
      subscriberId: null,
      paymentMethod: "cash",
      promoCode: "SAVE25",
    });
    expect(result.total).toBe(Number((sale(40) * 0.75).toFixed(2)));
    expect(result.promoId).toBe(7);
  });

  it("applies a flat promo code", async () => {
    const db = fakeDb({
      service: { id: "s1", price: 40, category: "quick service" },
      promo: { ...promo, discount_type: "flat", discount_amount: 10 },
    });
    const result = await computeAdminBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: [],
      subscriberId: null,
      paymentMethod: "cash",
      promoCode: "TENOFF",
    });
    expect(result.total).toBe(Number((sale(40) - 10).toFixed(2)));
    expect(result.promoId).toBe(7);
  });

  it("ignores a subscription-only code", async () => {
    const db = fakeDb({
      service: { id: "s1", price: 40, category: "quick service" },
      promo: { ...promo, applies_to: "subscription", discount_type: "percent", discount_percent: 25 },
    });
    const result = await computeAdminBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: [],
      subscriberId: null,
      paymentMethod: "cash",
      promoCode: "SUBONLY",
    });
    expect(result).toEqual({ servicePrice: sale(40), total: sale(40), promoId: null });
  });

  it("prices an add-ons-only booking from the database", async () => {
    const db = fakeDb({ addOns: [{ id: "a1", price: 10 }, { id: "a2", price: 5 }] });
    const result = await computeAdminBookingAmount(db, {
      servicePackageId: "",
      addOnIds: ["a1", "a2"],
      subscriberId: "u1",
      paymentMethod: "cash",
    });
    expect(result).toEqual({ servicePrice: 0, total: sale(15), promoId: null });
  });

  it("rejects a booking with no service and no add-ons", async () => {
    await expect(
      computeAdminBookingAmount(fakeDb({}), {
        servicePackageId: "",
        addOnIds: [],
        subscriberId: null,
        paymentMethod: "cash",
      })
    ).rejects.toThrow("Select a service package or at least one add-on");
  });
});
