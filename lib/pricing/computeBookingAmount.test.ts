import { describe, expect, it } from "vitest";
import { computeBookingAmount } from "./computeBookingAmount";
import {
  HOLIDAY_SALE_ACTIVE,
  HOLIDAY_SALE_DISCOUNT,
} from "@/lib/booking/holidaySale";
import { computeDisplayPricing } from "@/lib/booking/pricingDisplay";

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
        single: async () => api.maybeSingle(),
      };
      if (table === "add_ons") {
        return { select: () => ({ in: async () => ({ data: fixtures.addOns ?? [] }) }) };
      }
      return api;
    },
  } as any;
}

describe("computeBookingAmount", () => {
  it("charges base + add-ons for a non-subscriber", async () => {
    const db = fakeDb({
      service: { id: "s1", price: 50, category: "express detail" },
      addOns: [{ id: "a1", price: 10 }],
    });
    const result = await computeBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: ["a1"],
      userId: null,
      isAuthenticated: false,
      paymentMethod: "card",
    });
    expect(result.amount).toBe(sale(60));
    expect(result.servicePrice).toBe(sale(50));
    expect(result.isFree).toBe(false);
  });

  it("makes the service free when subscription plan covers the category", async () => {
    const db = fakeDb({
      service: { id: "s1", price: 50, category: "express detail" },
      addOns: [{ id: "a1", price: 10 }],
      subscription: { id: "sub1", subscription_plan_id: "p1", status: "active" },
      plan: { id: "p1", name: "Express Detail Monthly" },
    });
    const result = await computeBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: ["a1"],
      userId: "u1",
      isAuthenticated: true,
      paymentMethod: "subscription",
    });
    expect(result.amount).toBe(sale(10));
    expect(result.isFree).toBe(true);
  });

  it("charges exactly what the display lib shows (sale included)", async () => {
    const service = { id: "s1", price: 100, category: "quick service" };
    const addOns = [
      { id: "a1", price: 10 },
      { id: "a2", price: 5 },
    ];
    const db = fakeDb({ service, addOns });
    const charged = await computeBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: ["a1", "a2"],
      userId: null,
      isAuthenticated: false,
      paymentMethod: "card",
    });
    const displayed = computeDisplayPricing({
      service,
      addOns,
      planName: null,
      isVehicleSubscribed: false,
      promo: null,
    });
    expect(charged.amount).toBe(displayed.finalTotal);
  });

  it("rejects cash for unauthenticated users", async () => {
    const db = fakeDb({ service: { id: "s1", price: 50, category: "x" } });
    await expect(
      computeBookingAmount(db, {
        servicePackageId: "s1",
        addOnIds: [],
        userId: null,
        isAuthenticated: false,
        paymentMethod: "cash",
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws when the service package does not exist", async () => {
    const db = fakeDb({ service: null });
    await expect(
      computeBookingAmount(db, {
        servicePackageId: "missing",
        addOnIds: [],
        userId: null,
        isAuthenticated: false,
        paymentMethod: "card",
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});
