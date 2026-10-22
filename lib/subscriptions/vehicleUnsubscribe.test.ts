import { describe, expect, it } from "vitest";
import {
  cancelAtPeriodEndParams,
  isStripeResourceMissing,
  orderSubscriptionVehicles,
  planVehicleUnsubscribe,
  resolveFamilyItemId,
  type SubscriptionVehicleRow,
} from "./vehicleUnsubscribe";

function row(id: string, isPrimary: boolean, stripeItemId: string | null = null): SubscriptionVehicleRow {
  return { id, vehicle_id: `veh-${id}`, stripe_item_id: stripeItemId, is_primary: isPrimary };
}

describe("planVehicleUnsubscribe", () => {
  const vehicles = [row("p", true), row("f1", false), row("f2", false)];

  it("removes a family vehicle", () => {
    expect(planVehicleUnsubscribe(vehicles, "f2")).toEqual({
      kind: "remove-family",
      target: vehicles[2],
    });
  });

  it("promotes the oldest family vehicle when the primary is removed", () => {
    expect(planVehicleUnsubscribe(vehicles, "p")).toEqual({
      kind: "promote",
      target: vehicles[0],
      newPrimary: vehicles[1],
    });
  });

  it("cancels the subscription when the primary is the only vehicle", () => {
    const only = [row("p", true)];
    expect(planVehicleUnsubscribe(only, "p")).toEqual({
      kind: "cancel-subscription",
      target: only[0],
    });
  });

  it("returns null for a vehicle that isn't on the subscription", () => {
    expect(planVehicleUnsubscribe(vehicles, "someone-elses")).toBeNull();
  });
});

describe("orderSubscriptionVehicles", () => {
  it("puts the primary first, then family vehicles oldest first", () => {
    const ordered = orderSubscriptionVehicles([
      { id: "f2", is_primary: false, created_at: "2026-03-01T00:00:00Z" },
      { id: "p", is_primary: true, created_at: "2026-05-01T00:00:00Z" },
      { id: "f1", is_primary: false, created_at: "2026-01-01T00:00:00Z" },
    ]);
    expect(ordered.map((v) => v.id)).toEqual(["p", "f1", "f2"]);
  });
});

describe("resolveFamilyItemId", () => {
  const flock = (id: string, vehicleIndex?: string) => ({
    id,
    price: { metadata: { is_flock_item: "true", ...(vehicleIndex ? { vehicle_index: vehicleIndex } : {}) } },
  });

  it("prefers the stored item id", () => {
    const vehicles = [row("p", true, "si_p"), row("f1", false, "si_f1")];
    expect(resolveFamilyItemId(vehicles, 1, [])).toEqual({ id: "si_f1", via: "stored" });
  });

  it("falls back to vehicle_index price metadata", () => {
    const vehicles = [row("p", true, "si_p"), row("f1", false)];
    const items = [{ id: "si_p" }, flock("si_x", "1")];
    expect(resolveFamilyItemId(vehicles, 1, items)).toEqual({ id: "si_x", via: "metadata" });
  });

  it("matches by position among unclaimed flock items", () => {
    const vehicles = [row("p", true, "si_p"), row("f1", false, "si_f1"), row("f2", false), row("f3", false)];
    const items = [{ id: "si_p" }, flock("si_f1"), flock("si_a"), flock("si_b")];
    expect(resolveFamilyItemId(vehicles, 3, items)).toEqual({ id: "si_b", via: "flock-position" });
  });

  it("finds commercial items tagged is_flock_item but not discounted", () => {
    const vehicles = [row("p", true, "si_p"), row("f1", false)];
    const items = [
      { id: "si_p" },
      { id: "si_c", price: { metadata: { is_flock_item: "true", is_flock_discount: "false" } } },
    ];
    expect(resolveFamilyItemId(vehicles, 1, items)).toEqual({ id: "si_c", via: "flock-position" });
  });

  it("reports none when nothing matches", () => {
    const vehicles = [row("p", true), row("f1", false)];
    expect(resolveFamilyItemId(vehicles, 1, [{ id: "si_p" }])).toEqual({ id: null, via: "none" });
  });
});

describe("isStripeResourceMissing", () => {
  it("recognises Stripe's missing-object error only", () => {
    expect(isStripeResourceMissing({ code: "resource_missing" })).toBe(true);
    expect(isStripeResourceMissing({ code: "card_declined" })).toBe(false);
    expect(isStripeResourceMissing(new Error("network"))).toBe(false);
    expect(isStripeResourceMissing(null)).toBe(false);
  });
});

describe("cancelAtPeriodEndParams", () => {
  it("only schedules the cancel for a customer", () => {
    expect(cancelAtPeriodEndParams({ kind: "customer" })).toEqual({ cancel_at_period_end: true });
  });

  it("records the admin and reason on the Stripe subscription", () => {
    expect(
      cancelAtPeriodEndParams({ kind: "admin", adminId: "admin-1", reason: "Called in, moving away" }),
    ).toEqual({
      cancel_at_period_end: true,
      cancellation_details: { comment: "Cancelled by admin: Called in, moving away" },
      metadata: { canceled_by: "admin", canceled_by_admin_id: "admin-1" },
    });
  });
});
