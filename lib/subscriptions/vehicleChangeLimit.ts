/**
 * One vehicle change per 6 months.
 *
 * A subscription is priced per vehicle, so the risk is rotation: keep paying
 * for one slot but keep bringing different cars through it. A "change" is a
 * vehicle leaving the subscription AND a vehicle joining it within the same
 * 6-month window — in either order, so adding the new car first and removing
 * the old one second counts the same as the reverse.
 *
 * What the rule never blocks:
 *   - removing a vehicle or cancelling (a customer who sold a car must be able
 *     to stop paying for it);
 *   - pure additions with no removal in the window (a family adding a car).
 *
 * When locked, only adding a vehicle is refused, until the earlier of the two
 * most recent events (latest add, latest removal) is 6 months old. Staff can
 * lift the lock early with an "unlocked" event; anything before it is ignored.
 *
 * Pure — shared by the add-vehicle route, the customer billing page and the
 * admin users page so all three agree on the date.
 */

export const VEHICLE_CHANGE_COOLDOWN_MONTHS = 6;

export type VehicleChangeKind = "added" | "removed" | "unlocked";

export interface VehicleChangeEvent {
  kind: VehicleChangeKind;
  created_at: string;
}

export type VehicleChangeLock =
  | { locked: false }
  | { locked: true; lastChangeAt: Date; unlocksAt: Date };

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function vehicleChangeLock(
  events: VehicleChangeEvent[],
  now: Date = new Date(),
): VehicleChangeLock {
  const windowStart = addMonths(now, -VEHICLE_CHANGE_COOLDOWN_MONTHS).getTime();

  const lastUnlock = latest(events, "unlocked");
  const since = Math.max(windowStart, lastUnlock ?? -Infinity);

  const lastAdd = latest(events, "added", since);
  const lastRemove = latest(events, "removed", since);
  if (lastAdd === null || lastRemove === null) return { locked: false };

  return {
    locked: true,
    lastChangeAt: new Date(Math.max(lastAdd, lastRemove)),
    unlocksAt: addMonths(new Date(Math.min(lastAdd, lastRemove)), VEHICLE_CHANGE_COOLDOWN_MONTHS),
  };
}

/** Most recent timestamp of `kind` strictly after `after`, or null. */
function latest(events: VehicleChangeEvent[], kind: VehicleChangeKind, after = -Infinity): number | null {
  let best: number | null = null;
  for (const e of events) {
    if (e.kind !== kind) continue;
    const t = new Date(e.created_at).getTime();
    if (t > after && (best === null || t > best)) best = t;
  }
  return best;
}
