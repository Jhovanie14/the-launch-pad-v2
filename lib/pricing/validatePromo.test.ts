import { describe, expect, it } from "vitest";
import { validatePromo } from "./validatePromo";

function fakeDb(promo: any, alreadyRedeemed = false) {
  return {
    from(table: string) {
      if (table === "promo_codes") {
        return {
          select: () => ({
            ilike: () => ({ maybeSingle: async () => ({ data: promo }) }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: alreadyRedeemed ? { id: 1 } : null,
              }),
            }),
          }),
        }),
      };
    },
  } as any;
}

describe("validatePromo", () => {
  it("applies a percent discount", async () => {
    const db = fakeDb({
      id: 1, discount_type: "percent", discount_percent: 10,
      discount_amount: 0, is_active: true, max_uses: null, used_count: 0,
      restricted_to_service: null,
    });
    const r = await validatePromo(db, { code: "SAVE10", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(90);
    expect(r.promoId).toBe(1);
  });

  it("applies a flat discount and never goes negative", async () => {
    const db = fakeDb({
      id: 2, discount_type: "flat", discount_percent: 0,
      discount_amount: 150, is_active: true, max_uses: null, used_count: 0,
      restricted_to_service: null,
    });
    const r = await validatePromo(db, { code: "BIG", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(0);
  });

  it("rejects an inactive code (no discount)", async () => {
    const db = fakeDb({ id: 3, is_active: false });
    const r = await validatePromo(db, { code: "OFF", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("rejects a maxed-out code", async () => {
    const db = fakeDb({
      id: 4, discount_type: "percent", discount_percent: 50,
      is_active: true, max_uses: 5, used_count: 5, restricted_to_service: null,
    });
    const r = await validatePromo(db, { code: "MAX", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("rejects a code already redeemed by the user", async () => {
    const db = fakeDb(
      { id: 5, discount_type: "percent", discount_percent: 50, is_active: true,
        max_uses: null, used_count: 0, restricted_to_service: null },
      true
    );
    const r = await validatePromo(db, { code: "ONCE", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("rejects a code restricted to a different service", async () => {
    const db = fakeDb({
      id: 6, discount_type: "percent", discount_percent: 50, is_active: true,
      max_uses: null, used_count: 0, restricted_to_service: "other-service",
    });
    const r = await validatePromo(db, { code: "SVC", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("returns no discount when no code is given", async () => {
    const db = fakeDb(null);
    const r = await validatePromo(db, { code: "", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });
});
