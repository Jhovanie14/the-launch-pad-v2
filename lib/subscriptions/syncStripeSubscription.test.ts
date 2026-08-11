import { describe, expect, it } from "vitest";
import {
  applySubscriptionDeleted,
  applySubscriptionUpdate,
  wasCancelJustScheduled,
} from "./syncStripeSubscription";

const FIELDS = {
  stripeSubscriptionId: "sub_123",
  status: "active",
  currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
  currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
  cancelAtPeriodEnd: true,
  priceId: "price_1",
  metadataPlanId: null,
  metadataBillingCycle: "monthly",
};

/**
 * Fake Supabase. `express` / `self` control whether each table's update
 * matches a row. Records every update payload per table.
 */
function fakeDb(opts: {
  express?: { id: string; user_id: string } | null;
  self?: { id: string; user_id: string } | null;
  existingPlan?: { subscription_plan_id: string | null; billing_cycle: string | null } | null;
}) {
  const updates: Record<string, any[]> = {
    user_subscription: [],
    self_service_subscriptions: [],
  };
  const db = {
    from(table: string) {
      if (table === "user_subscription") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.existingPlan ?? null,
                error: null,
              }),
            }),
          }),
          update: (values: any) => ({
            eq: () => ({
              select: () => ({
                maybeSingle: async () => {
                  updates.user_subscription.push(values);
                  return { data: opts.express ?? null, error: null };
                },
              }),
            }),
          }),
        };
      }
      if (table === "self_service_subscriptions") {
        return {
          update: (values: any) => ({
            eq: () => ({
              select: () => ({
                maybeSingle: async () => {
                  updates.self_service_subscriptions.push(values);
                  return { data: opts.self ?? null, error: null };
                },
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as any;
  return { db, updates };
}

describe("applySubscriptionUpdate", () => {
  it("updates the express row and never touches self-service", async () => {
    const { db, updates } = fakeDb({
      express: { id: "row-1", user_id: "user-1" },
      existingPlan: { subscription_plan_id: "plan-9", billing_cycle: "year" },
    });
    const result = await applySubscriptionUpdate(db, FIELDS);
    expect(result).toEqual({
      table: "user_subscription",
      userId: "user-1",
      rowId: "row-1",
    });
    expect(updates.self_service_subscriptions).toHaveLength(0);
    // express payload keeps the full field set, with metadata fallbacks applied
    expect(updates.user_subscription[0]).toEqual({
      status: "active",
      current_period_start: "2026-08-01T00:00:00.000Z",
      current_period_end: "2026-09-01T00:00:00.000Z",
      cancel_at_period_end: true,
      price_id: "price_1",
      billing_cycle: "month", // metadata "monthly" normalized
      subscription_plan_id: "plan-9", // fell back to existing row's plan
    });
  });

  it("falls through to self-service when no express row matches", async () => {
    const { db, updates } = fakeDb({
      express: null,
      self: { id: "ss-1", user_id: "user-2" },
    });
    const result = await applySubscriptionUpdate(db, FIELDS);
    expect(result).toEqual({
      table: "self_service_subscriptions",
      userId: "user-2",
      rowId: "ss-1",
    });
    // self-service payload is the slim set — no price/plan/billing columns
    expect(updates.self_service_subscriptions[0]).toEqual({
      status: "active",
      current_period_start: "2026-08-01T00:00:00.000Z",
      current_period_end: "2026-09-01T00:00:00.000Z",
      cancel_at_period_end: true,
    });
  });

  it("returns a null result when neither table matches", async () => {
    const { db } = fakeDb({ express: null, self: null });
    const result = await applySubscriptionUpdate(db, FIELDS);
    expect(result).toEqual({ table: null, userId: null, rowId: null });
  });

  it("keeps the existing billing cycle when metadata has none", async () => {
    const { db, updates } = fakeDb({
      express: { id: "row-1", user_id: "user-1" },
      existingPlan: { subscription_plan_id: "plan-9", billing_cycle: "year" },
    });
    await applySubscriptionUpdate(db, { ...FIELDS, metadataBillingCycle: null });
    expect(updates.user_subscription[0].billing_cycle).toBe("year");
  });
});

describe("applySubscriptionDeleted", () => {
  it("cancels the express row when it matches", async () => {
    const { db, updates } = fakeDb({ express: { id: "row-1", user_id: "user-1" } });
    const result = await applySubscriptionDeleted(db, "sub_123");
    expect(result.table).toBe("user_subscription");
    expect(result.userId).toBe("user-1");
    expect(updates.user_subscription[0]).toEqual({
      status: "canceled",
      cancel_at_period_end: false,
    });
    expect(updates.self_service_subscriptions).toHaveLength(0);
  });

  it("falls through and cancels the self-service row", async () => {
    const { db, updates } = fakeDb({
      express: null,
      self: { id: "ss-1", user_id: "user-2" },
    });
    const result = await applySubscriptionDeleted(db, "sub_123");
    expect(result.table).toBe("self_service_subscriptions");
    expect(result.userId).toBe("user-2");
    expect(updates.self_service_subscriptions[0]).toEqual({
      status: "canceled",
      cancel_at_period_end: false,
    });
  });

  it("returns null result when neither matches", async () => {
    const { db } = fakeDb({ express: null, self: null });
    expect(await applySubscriptionDeleted(db, "sub_x")).toEqual({
      table: null,
      userId: null,
      rowId: null,
    });
  });
});

describe("wasCancelJustScheduled", () => {
  it("is true only when previous_attributes shows false -> true", () => {
    expect(wasCancelJustScheduled({ cancel_at_period_end: false }, true)).toBe(true);
    expect(wasCancelJustScheduled({ cancel_at_period_end: true }, true)).toBe(false);
    expect(wasCancelJustScheduled({}, true)).toBe(false);
    expect(wasCancelJustScheduled({ cancel_at_period_end: false }, false)).toBe(false);
  });
});
