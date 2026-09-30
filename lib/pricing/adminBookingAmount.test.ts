import { describe, expect, it } from "vitest";
import {
  applyAdminDiscount,
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
}) {
  return {
    from(table: string) {
      const api: any = {
        select: () => api,
        eq: () => api,
        in: () => api,
        maybeSingle: async () => {
          if (table === "service_packages") return { data: fixtures.service ?? null };
          if (table === "user_subscription") return { data: fixtures.subscription ?? null };
          if (table === "subscription_plans") return { data: fixtures.plan ?? null };
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
    expect(result).toEqual({ servicePrice: 0, total: 0 });
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
    expect(result).toEqual({ servicePrice: 0, total: sale(10) });
  });

  it("lets an admin take cash from a customer with no account", async () => {
    const db = fakeDb({ service: { id: "s1", price: 30, category: "quick service" } });
    const result = await computeAdminBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: [],
      subscriberId: null,
      paymentMethod: "cash",
      discountPercent: 50,
    });
    expect(result.total).toBe(applyAdminDiscount(sale(30), 50));
  });

  it("prices an add-ons-only booking from the database", async () => {
    const db = fakeDb({ addOns: [{ id: "a1", price: 10 }, { id: "a2", price: 5 }] });
    const result = await computeAdminBookingAmount(db, {
      servicePackageId: "",
      addOnIds: ["a1", "a2"],
      subscriberId: "u1",
      paymentMethod: "cash",
    });
    expect(result).toEqual({ servicePrice: 0, total: sale(15) });
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

describe("applyAdminDiscount", () => {
  it("applies the percentage", () => {
    expect(applyAdminDiscount(80, 25)).toBe(60);
  });

  it("clamps out-of-range and non-numeric values", () => {
    expect(applyAdminDiscount(80, -50)).toBe(80);
    expect(applyAdminDiscount(80, 150)).toBe(0);
    expect(applyAdminDiscount(80, Number.NaN)).toBe(80);
  });
});
