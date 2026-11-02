/**
 * Pure helpers for unsubscribing vehicles and cancelling subscriptions.
 * No Stripe client or DB access here, so the admin UI can preview the same
 * decision the server makes and the rules stay unit-testable.
 */

export interface SubscriptionVehicleRow {
  id: string;
  vehicle_id: string;
  stripe_item_id: string | null;
  is_primary: boolean;
}

export interface StripeItemLike {
  id: string;
  price?: { metadata?: Record<string, string> | null } | null;
}

/** Who is acting on the subscription. Admin actions carry a required reason. */
export type SubscriptionActor =
  | { kind: "customer" }
  | { kind: "admin"; adminId: string; reason: string };

type PlanRow = Pick<SubscriptionVehicleRow, "id" | "is_primary">;

export type VehicleUnsubscribePlan<T extends PlanRow = SubscriptionVehicleRow> =
  | { kind: "remove-family"; target: T }
  | { kind: "promote"; target: T; newPrimary: T }
  | { kind: "cancel-subscription"; target: T };

/** Primary first, then oldest first — the order subscriptionService.ts uses. */
export function orderSubscriptionVehicles<T extends PlanRow & { created_at?: string | null }>(
  vehicles: T[],
): T[] {
  return [...vehicles].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) ||
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
}

/**
 * What unsubscribing one vehicle means. `vehicles` must be in
 * orderSubscriptionVehicles order, so the promoted vehicle is the
 * longest-standing family vehicle.
 *
 * - family vehicle → remove it
 * - primary with family vehicles → promote the oldest family vehicle
 * - only vehicle → cancel the whole subscription
 *
 * Returns null when the vehicle isn't on this subscription.
 */
export function planVehicleUnsubscribe<T extends PlanRow>(
  vehicles: T[],
  subscriptionVehicleId: string,
): VehicleUnsubscribePlan<T> | null {
  const target = vehicles.find((v) => v.id === subscriptionVehicleId);
  if (!target) return null;
  if (!target.is_primary) return { kind: "remove-family", target };

  const newPrimary = vehicles.find((v) => v.id !== target.id);
  return newPrimary
    ? { kind: "promote", target, newPrimary }
    : { kind: "cancel-subscription", target };
}

/**
 * Resolve the Stripe item that bills a family vehicle. Prefers the stored
 * stripe_item_id; older rows predate it, so fall back to the price metadata
 * set at checkout, then to position among unmatched flock items, then to raw
 * index. `vehicles` must be ordered as in planVehicleUnsubscribe.
 */
export function resolveFamilyItemId(
  vehicles: SubscriptionVehicleRow[],
  vehicleIndex: number,
  items: StripeItemLike[],
): { id: string | null; via: "stored" | "metadata" | "flock-position" | "index-fallback" | "none" } {
  const stored = vehicles[vehicleIndex]?.stripe_item_id;
  if (stored) return { id: stored, via: "stored" };

  // Primary match: vehicle_index in price metadata (set at checkout for each vehicle)
  const byMetadata = items.find(
    (item) => item.price?.metadata?.vehicle_index === vehicleIndex.toString(),
  );
  if (byMetadata) return { id: byMetadata.id, via: "metadata" };

  // Secondary match: position among flock items no DB row has claimed.
  // `is_flock_item` tags additional-vehicle prices at either rate; commercial
  // items are full price and so carry is_flock_discount="false". Matching on
  // the legacy tag alone would miss them entirely.
  const storedItemIds = new Set(vehicles.map((v) => v.stripe_item_id).filter(Boolean));
  const unmatchedFlockItems = items.filter(
    (item) =>
      (item.price?.metadata?.is_flock_item === "true" ||
        item.price?.metadata?.is_flock_discount === "true") &&
      !storedItemIds.has(item.id),
  );
  // How many family vehicles before this one also lack a stripe_item_id?
  const familyVehiclesBeforeThis = vehicles
    .slice(1, vehicleIndex)
    .filter((v) => !v.stripe_item_id).length;
  const byFlockPosition = unmatchedFlockItems[familyVehiclesBeforeThis];
  if (byFlockPosition) return { id: byFlockPosition.id, via: "flock-position" };

  const byIndex = items[vehicleIndex];
  return byIndex ? { id: byIndex.id, via: "index-fallback" } : { id: null, via: "none" };
}

/** Stripe's "No such …" error — the object is already gone. */
export function isStripeResourceMissing(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "resource_missing";
}

/**
 * Params for scheduling a cancel at period end. Admin cancels also record
 * who did it and why on the Stripe subscription, so the Stripe Dashboard
 * tells the same story as our audit table.
 */
export function cancelAtPeriodEndParams(actor: SubscriptionActor) {
  if (actor.kind === "customer") return { cancel_at_period_end: true };
  return {
    cancel_at_period_end: true,
    cancellation_details: { comment: `Cancelled by admin: ${actor.reason}` },
    metadata: { canceled_by: "admin", canceled_by_admin_id: actor.adminId },
  };
}
