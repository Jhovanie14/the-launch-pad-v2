import { describe, expect, it } from "vitest";
import { recordPromoRedemption, validatePromo } from "./validatePromo";

/** Minimal chainable fake Supabase covering the reads validatePromo makes. */
function fakeDb(
  promo: any,
  opts: {
    alreadyRedeemed?: boolean;
    redemptionCount?: number;
    service?: { name: string; category: string } | null;
  } = {}
) {
  const inserts: any[] = [];
  const db = {
    inserts,
    from(table: string) {
      const q: any = {
        select: () => q,
        ilike: () => q,
        eq: () => q,
        insert: async (row: any) => {
          inserts.push({ table, row });
          return { error: null };
        },
        maybeSingle: async () => {
          if (table === "promo_codes") return { data: promo };
          if (table === "service_packages") return { data: opts.service ?? null };
          if (table === "promo_code_redemptions")
            return { data: opts.alreadyRedeemed ? { id: 1 } : null };
          return { data: null };
        },
        // Awaiting the builder directly = a head/count query.
        then: (resolve: any) => resolve({ count: opts.redemptionCount ?? 0 }),
      };
      return q;
    },
  };
  return db as any;
}

const base = {
  discount_amount: 0, is_active: true, applies_to: "one_time",
  max_uses: null, used_count: 0, restricted_to_service: null,
};

describe("validatePromo", () => {
  it("applies a percent discount", async () => {
    const db = fakeDb({ ...base, id: 1, discount_type: "percent", discount_percent: 10 });
    const r = await validatePromo(db, { code: "SAVE10", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(90);
    expect(r.promoId).toBe(1);
  });

  it("applies a flat discount and never goes negative", async () => {
    const db = fakeDb({ ...base, id: 2, discount_type: "flat", discount_amount: 150 });
    const r = await validatePromo(db, { code: "BIG", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(0);
  });

  it("rejects an inactive code (no discount)", async () => {
    const db = fakeDb({ ...base, id: 3, is_active: false });
    const r = await validatePromo(db, { code: "OFF", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("accepts 'both' codes but rejects subscription-only codes", async () => {
    const both = fakeDb({ ...base, id: 4, applies_to: "both", discount_type: "percent", discount_percent: 10 });
    expect((await validatePromo(both, { code: "B", baseAmount: 100, userId: null, serviceId: "s1" })).promoId).toBe(4);

    const sub = fakeDb({ ...base, id: 5, applies_to: "subscription", discount_type: "percent", discount_percent: 10 });
    const r = await validatePromo(sub, { code: "S", baseAmount: 100, userId: null, serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("rejects a code maxed out by used_count", async () => {
    const db = fakeDb({ ...base, id: 6, discount_type: "percent", discount_percent: 50, max_uses: 5, used_count: 5 });
    const r = await validatePromo(db, { code: "MAX", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.promoId).toBeNull();
  });

  it("rejects a code maxed out by redemption rows even if used_count lags", async () => {
    const db = fakeDb(
      { ...base, id: 7, discount_type: "percent", discount_percent: 50, max_uses: 3, used_count: 0 },
      { redemptionCount: 3 }
    );
    const r = await validatePromo(db, { code: "MAX", baseAmount: 100, userId: null, serviceId: "s1" });
    expect(r.promoId).toBeNull();
  });

  it("still applies a capped code that has uses left", async () => {
    const db = fakeDb(
      { ...base, id: 8, discount_type: "percent", discount_percent: 50, max_uses: 3 },
      { redemptionCount: 2 }
    );
    const r = await validatePromo(db, { code: "MAX", baseAmount: 100, userId: null, serviceId: "s1" });
    expect(r.discountedAmount).toBe(50);
  });

  it("rejects a code already redeemed by the user", async () => {
    const db = fakeDb(
      { ...base, id: 9, discount_type: "percent", discount_percent: 50 },
      { alreadyRedeemed: true }
    );
    const r = await validatePromo(db, { code: "ONCE", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("applies a service-restricted code when the service name matches", async () => {
    const db = fakeDb(
      { ...base, id: 10, discount_type: "percent", discount_percent: 20, restricted_to_service: "classic complete" },
      { service: { name: "Classic Complete Detail", category: "express detail" } }
    );
    const r = await validatePromo(db, { code: "SVC", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(80);
  });

  it("applies a service-restricted code when the category matches", async () => {
    const db = fakeDb(
      { ...base, id: 11, discount_type: "percent", discount_percent: 20, restricted_to_service: "express" },
      { service: { name: "Interior Refresh", category: "express detail" } }
    );
    const r = await validatePromo(db, { code: "SVC", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(80);
  });

  it("rejects a code restricted to a different service", async () => {
    const db = fakeDb(
      { ...base, id: 12, discount_type: "percent", discount_percent: 50, restricted_to_service: "classic complete" },
      { service: { name: "Quick Wash", category: "quick service" } }
    );
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

describe("recordPromoRedemption", () => {
  it("inserts a redemption row", async () => {
    const db = fakeDb(null);
    await recordPromoRedemption(db, { promoId: 3, userId: null, customerEmail: "a@b.co" });
    expect(db.inserts).toEqual([
      {
        table: "promo_code_redemptions",
        row: { promo_code_id: 3, user_id: null, customer_email: "a@b.co" },
      },
    ]);
  });
});
