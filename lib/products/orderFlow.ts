// Store order flow: payment and fulfilment are separate facts, so a
// pay-at-store order can be "ready but unpaid". Every transition the staff
// screen, the customer cancel, the webhook and the hold job make goes through
// these rules. Spec: docs/superpowers/specs/2026-11-24-store-pickup-pay-at-store-design.md

import { ApiError } from "@/lib/http/apiError";

export type PaymentMethod = "card" | "at_store";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type FulfilmentStatus = "placed" | "ready" | "completed" | "released" | "cancelled" | "out_for_delivery";
export type PaidVia = "stripe" | "cash" | "card_reader" | "counter_qr";
export type StaffAction = "mark_ready" | "hand_over" | "take_payment" | "release";

export interface FlowOrder {
  payment_method: PaymentMethod | string;
  payment_status: PaymentStatus | string;
  fulfilment_status: FulfilmentStatus | string;
  fulfillment_method: "pickup" | "delivery" | string;
  hold_until: string | null;
  reminder_sent_at?: string | null;
  total: number;
}

export type OrderPatch = Partial<Record<string, string | boolean | null>>;

/** The order business's local clock (Houston). */
export const STORE_TIME_ZONE = "America/Chicago";

export const PAID_VIA_LABEL: Record<PaidVia, string> = {
  stripe: "Card (online)",
  cash: "Cash",
  card_reader: "Card reader",
  counter_qr: "Counter QR",
};

const COUNTER_METHODS: PaidVia[] = ["cash", "card_reader", "counter_qr"];

// ── Houston calendar ───────────────────────────────────────────────────────

/** Y/M/D of an instant on the Houston calendar. */
function houstonYmd(at: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: n("year"), m: n("month"), d: n("day") };
}

/** Houston's offset from UTC, in minutes, at an instant (-360 for CST). */
function houstonOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** The UTC instant of 23:59:59.999 Houston time on that local date. */
function endOfHoustonDay(y: number, m: number, d: number): Date {
  const wallUtc = Date.UTC(y, m - 1, d, 23, 59, 59, 999);
  // The offset at local noon that day is the offset in force at 23:59 too
  // (DST changes happen at 2 AM).
  const offset = houstonOffsetMinutes(new Date(Date.UTC(y, m - 1, d, 18)));
  return new Date(wallUtc - offset * 60000);
}

/** "YYYY-MM-DD" on the Houston calendar. */
function houstonDateKey(at: Date): string {
  const { y, m, d } = houstonYmd(at);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** End of the Houston day that is holdDays after the day the order was marked ready. */
export function holdUntil(readyAt: Date, holdDays: number): string {
  const { y, m, d } = houstonYmd(readyAt);
  const target = new Date(Date.UTC(y, m - 1, d + holdDays));
  return endOfHoustonDay(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate()).toISOString();
}

/** "Thu, Nov 26" on the Houston calendar. */
export function houstonDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

// ── State predicates ───────────────────────────────────────────────────────

const isOpen = (o: FlowOrder) => o.fulfilment_status === "placed" || o.fulfilment_status === "ready";

/** A pay-at-store order nobody has paid for yet, still on the shelf for them. */
export function isUnpaidReservation(o: FlowOrder): boolean {
  return o.payment_method === "at_store" && o.payment_status === "unpaid" && isOpen(o);
}

/** The reminder goes on the Houston day before the hold date, once. */
export function needsReminder(o: FlowOrder, now: Date): boolean {
  if (!isUnpaidReservation(o) || o.fulfilment_status !== "ready" || !o.hold_until || o.reminder_sent_at) return false;
  const holdDate = houstonDateKey(new Date(o.hold_until));
  return houstonDateKey(now) === addDaysToKey(holdDate, -1);
}

export function isOverdueHold(o: FlowOrder, now: Date): boolean {
  if (!isUnpaidReservation(o) || !o.hold_until) return false;
  return now.getTime() > new Date(o.hold_until).getTime();
}

export function customerCanCancel(o: FlowOrder): boolean {
  return isUnpaidReservation(o);
}

// ── Staff actions ──────────────────────────────────────────────────────────

const refuse = (message: string): never => {
  throw new ApiError(message, 400);
};

export function applyStaffAction(
  o: FlowOrder,
  action: StaffAction,
  ctx: { now: Date; holdDays: number; staffId: string; paidVia?: PaidVia | string },
): OrderPatch {
  const now = ctx.now.toISOString();
  const paid = o.payment_status === "paid";
  const reservation = isUnpaidReservation(o);

  switch (action) {
    case "mark_ready":
      if (o.fulfilment_status !== "placed") refuse("Only a new order can be marked ready.");
      if (!paid && !reservation) refuse("This card order hasn't been paid yet.");
      return {
        fulfilment_status: "ready",
        ready_at: now,
        hold_until: reservation ? holdUntil(ctx.now, ctx.holdDays) : null,
      };

    case "hand_over":
      if (!paid) refuse("This order isn't paid yet. Take payment first.");
      if (!["placed", "ready", "out_for_delivery"].includes(o.fulfilment_status)) {
        refuse("This order is already closed.");
      }
      return { fulfilment_status: "completed", completed_at: now, completed_by: ctx.staffId };

    case "take_payment":
      if (!reservation) refuse("Only an unpaid pay-at-store order can take payment at the counter.");
      if (!COUNTER_METHODS.includes(ctx.paidVia as PaidVia)) refuse("Choose how they paid: cash, card reader or counter QR.");
      return {
        payment_status: "paid",
        paid_via: ctx.paidVia as PaidVia,
        paid_at: now,
        fulfilment_status: "completed",
        completed_at: now,
        completed_by: ctx.staffId,
      };

    case "release":
      if (!reservation) refuse("Only an unpaid pay-at-store order can be released.");
      return { fulfilment_status: "released", released_at: now };
  }
}

/** The buttons a staff member sees, main action first. */
export function staffActionsFor(o: FlowOrder): StaffAction[] {
  const paid = o.payment_status === "paid";
  if (isUnpaidReservation(o)) {
    return o.fulfilment_status === "placed" ? ["mark_ready", "take_payment", "release"] : ["take_payment", "release"];
  }
  if (!paid) return [];
  if (o.fulfilment_status === "placed") return ["mark_ready", "hand_over"];
  if (o.fulfilment_status === "ready" || o.fulfilment_status === "out_for_delivery") return ["hand_over"];
  return [];
}

// ── Labels and queues ──────────────────────────────────────────────────────

export function customerStatus(o: FlowOrder): { label: string; tone: "neutral" | "ready" | "done" | "closed" } {
  if (o.payment_status === "refunded") return { label: "Refunded", tone: "closed" };
  switch (o.fulfilment_status) {
    case "ready":
      return { label: "Ready to collect", tone: "ready" };
    case "out_for_delivery":
      return { label: "Out for delivery", tone: "neutral" };
    case "completed":
      return { label: o.fulfillment_method === "delivery" ? "Delivered" : "Picked up", tone: "done" };
    case "released":
      return { label: "Released", tone: "closed" };
    case "cancelled":
      return { label: "Cancelled", tone: "closed" };
    default:
      if (o.payment_status === "paid") return { label: "Paid", tone: "neutral" };
      return o.payment_method === "at_store"
        ? { label: "Reserved", tone: "neutral" }
        : { label: "Waiting for payment", tone: "neutral" };
  }
}

export type StaffQueue = "to_pack" | "ready" | "unpaid" | "completed" | "closed" | "hidden";

/** The admin tab an order belongs to. "unpaid" is a cross-cutting filter (isUnpaidReservation). */
export function staffQueue(o: FlowOrder): StaffQueue {
  if (o.payment_status === "refunded" || o.fulfilment_status === "released" || o.fulfilment_status === "cancelled") {
    return "closed";
  }
  if (o.fulfilment_status === "completed") return "completed";
  if (o.fulfilment_status === "ready" || o.fulfilment_status === "out_for_delivery") return "ready";
  if (o.payment_status === "paid" || o.payment_method === "at_store") return "to_pack";
  return "hidden"; // a card order still at Stripe checkout
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The admin sidebar's Store orders count: orders waiting to be packed, plus
 * unpaid reservations whose hold ends within the next day.
 */
export function needsActionCount(orders: FlowOrder[], now: Date): number {
  return orders.filter((o) => {
    if (staffQueue(o) === "to_pack") return true;
    return (
      isUnpaidReservation(o) &&
      o.fulfilment_status === "ready" &&
      !!o.hold_until &&
      new Date(o.hold_until).getTime() - now.getTime() <= DAY_MS
    );
  }).length;
}

/** The confirmation page's headline, from the order's real state. */
export function successHeading(o: FlowOrder): string {
  if (o.payment_status === "refunded") return "Order refunded";
  switch (o.fulfilment_status) {
    case "released":
      return "Reservation released";
    case "cancelled":
      return "Order cancelled";
    case "completed":
      return o.fulfillment_method === "delivery" ? "Delivered" : "Picked up";
    default:
      if (o.payment_status === "paid") return "You're all set";
      return o.payment_method === "at_store" ? "Reserved for pickup" : "Almost there";
  }
}
