import { describe, expect, it } from "vitest";
import {
  applyStaffAction,
  customerCanCancel,
  customerStatus,
  holdUntil,
  houstonDateLabel,
  isShippingOrder,
  isOverdueHold,
  isUnpaidReservation,
  needsActionCount,
  PAID_VIA_LABEL,
  successHeading,
  needsReminder,
  staffActionsFor,
  staffQueue,
  uspsTrackingUrl,
  type FlowOrder,
} from "./orderFlow";

const NOW = new Date("2026-11-23T16:00:00Z"); // Mon Nov 23, 10:00 AM Houston (CST)
const ctx = { now: NOW, holdDays: 3, staffId: "staff-1" };

function order(over: Partial<FlowOrder> = {}): FlowOrder {
  return {
    payment_method: "at_store",
    payment_status: "unpaid",
    fulfilment_status: "placed",
    fulfillment_method: "pickup",
    hold_until: null,
    reminder_sent_at: null,
    total: 25.2,
    ...over,
  };
}
const cardPaid = (over: Partial<FlowOrder> = {}) =>
  order({ payment_method: "card", payment_status: "paid", ...over });
/** A paid shipping order waiting for its label. */
const shipping = (over: Partial<FlowOrder> = {}) => cardPaid({ fulfillment_method: "delivery", ...over });
const shipped = (over: Partial<FlowOrder> = {}) => shipping({ fulfilment_status: "out_for_delivery", ...over });

describe("holdUntil (Houston calendar days)", () => {
  it("holds through the end of the day, hold_days after the ready date", () => {
    expect(holdUntil(NOW, 3)).toBe("2026-11-27T05:59:59.999Z"); // through Thu Nov 26
  });
  it("late at night still counts from that local date", () => {
    expect(holdUntil(new Date("2026-11-24T05:30:00Z"), 3)).toBe("2026-11-27T05:59:59.999Z"); // 11:30 PM Mon
  });
  it("hold_days 1 and 14", () => {
    expect(holdUntil(NOW, 1)).toBe("2026-11-25T05:59:59.999Z");
    expect(holdUntil(NOW, 14)).toBe("2026-12-08T05:59:59.999Z");
  });
  it("crosses the DST change", () => {
    // Fri Mar 6 10:00 CST, +3 days = Mon Mar 9 (CDT, UTC-5)
    expect(holdUntil(new Date("2026-03-06T16:00:00Z"), 3)).toBe("2026-03-10T04:59:59.999Z");
  });
  it("labels the hold date in Houston time", () => {
    expect(houstonDateLabel("2026-11-27T05:59:59.999Z")).toBe("Thu, Nov 26");
  });
});

describe("reminders and expiry", () => {
  const held = order({ fulfilment_status: "ready", hold_until: "2026-11-27T05:59:59.999Z" });

  it("reminds on the Houston day before the hold date", () => {
    expect(needsReminder(held, new Date("2026-11-25T15:00:00Z"))).toBe(true); // Wed 9 AM
    expect(needsReminder(held, new Date("2026-11-26T15:00:00Z"))).toBe(false); // Thu 9 AM
    expect(needsReminder({ ...held, reminder_sent_at: "2026-11-25T15:00:00Z" }, new Date("2026-11-25T16:00:00Z"))).toBe(false);
  });
  it("never reminds paid or card orders", () => {
    expect(needsReminder({ ...held, payment_status: "paid" }, new Date("2026-11-25T15:00:00Z"))).toBe(false);
  });
  it("is overdue only after the hold date ends", () => {
    expect(isOverdueHold(held, new Date("2026-11-27T05:00:00Z"))).toBe(false); // Thu 11 PM
    expect(isOverdueHold(held, new Date("2026-11-27T15:00:00Z"))).toBe(true); // Fri 9 AM
    expect(isOverdueHold({ ...held, payment_status: "paid" }, new Date("2026-11-27T15:00:00Z"))).toBe(false);
  });
});

describe("applyStaffAction: allowed", () => {
  it("mark_ready on an unpaid reservation starts the hold", () => {
    expect(applyStaffAction(order(), "mark_ready", ctx)).toEqual({
      fulfilment_status: "ready",
      ready_at: NOW.toISOString(),
      hold_until: "2026-11-27T05:59:59.999Z",
    });
  });
  it("mark_ready on a paid card order has no hold", () => {
    expect(applyStaffAction(cardPaid(), "mark_ready", ctx)).toEqual({
      fulfilment_status: "ready",
      ready_at: NOW.toISOString(),
      hold_until: null,
    });
  });
  it("hand_over on a paid order, from ready or placed", () => {
    const want = { fulfilment_status: "completed", completed_at: NOW.toISOString(), completed_by: "staff-1" };
    expect(applyStaffAction(cardPaid({ fulfilment_status: "ready" }), "hand_over", ctx)).toEqual(want);
    expect(applyStaffAction(cardPaid(), "hand_over", ctx)).toEqual(want);
  });
  it("mark_delivered closes a shipped order (also legacy delivery orders)", () => {
    expect(applyStaffAction(shipped(), "mark_delivered", ctx)).toEqual({
      fulfilment_status: "completed",
      completed_at: NOW.toISOString(),
      completed_by: "staff-1",
      delivered_at: NOW.toISOString(),
    });
  });
  it("take_payment records the method and completes, from ready or placed", () => {
    const want = {
      payment_status: "paid",
      paid_via: "cash",
      paid_at: NOW.toISOString(),
      fulfilment_status: "completed",
      completed_at: NOW.toISOString(),
      completed_by: "staff-1",
    };
    expect(applyStaffAction(order({ fulfilment_status: "ready" }), "take_payment", { ...ctx, paidVia: "cash" })).toEqual(want);
    expect(applyStaffAction(order(), "take_payment", { ...ctx, paidVia: "cash" })).toEqual(want);
  });
  it("take_payment records Zelle", () => {
    expect(applyStaffAction(order({ fulfilment_status: "ready" }), "take_payment", { ...ctx, paidVia: "zelle" })).toMatchObject({
      payment_status: "paid",
      paid_via: "zelle",
      fulfilment_status: "completed",
    });
    expect(PAID_VIA_LABEL.zelle).toBe("Zelle");
  });
  it("take_payment without a method names every counter method", () => {
    expect(() => applyStaffAction(order({ fulfilment_status: "ready" }), "take_payment", ctx)).toThrow(
      "Choose how they paid: cash, card reader, Zelle or counter QR.",
    );
  });
  it("release an unpaid reservation", () => {
    expect(applyStaffAction(order({ fulfilment_status: "ready" }), "release", ctx)).toEqual({
      fulfilment_status: "released",
      released_at: NOW.toISOString(),
    });
  });
});

describe("applyStaffAction: refused", () => {
  const refuse = (o: FlowOrder, a: Parameters<typeof applyStaffAction>[1], extra = {}) =>
    expect(() => applyStaffAction(o, a, { ...ctx, ...extra })).toThrow();

  it("hand_over on an unpaid order", () => refuse(order({ fulfilment_status: "ready" }), "hand_over"));
  it("take_payment on a card order", () => refuse(order({ payment_method: "card", fulfilment_status: "ready" }), "take_payment", { paidVia: "cash" }));
  it("take_payment without a method", () => refuse(order({ fulfilment_status: "ready" }), "take_payment"));
  it("take_payment recorded as stripe", () => refuse(order({ fulfilment_status: "ready" }), "take_payment", { paidVia: "stripe" }));
  it("release on a paid order", () => refuse(cardPaid({ fulfilment_status: "ready" }), "release"));
  it("mark_ready on a card order still waiting for payment", () => refuse(order({ payment_method: "card" }), "mark_ready"));
  it("anything on a completed order", () => {
    for (const a of ["mark_ready", "hand_over", "take_payment", "release"] as const) {
      refuse(cardPaid({ fulfilment_status: "completed" }), a, { paidVia: "cash" });
    }
  });
  it("throws a 400 with a readable message", () => {
    try {
      applyStaffAction(order({ fulfilment_status: "ready" }), "hand_over", ctx);
    } catch (e) {
      expect((e as { status: number }).status).toBe(400);
      expect((e as Error).message.length).toBeGreaterThan(10);
    }
  });
});

describe("what staff and customers see", () => {
  it("staff actions per state", () => {
    expect(staffActionsFor(order())).toEqual(["mark_ready", "take_payment", "release"]);
    expect(staffActionsFor(order({ fulfilment_status: "ready" }))).toEqual(["take_payment", "release"]);
    expect(staffActionsFor(cardPaid())).toEqual(["mark_ready", "hand_over"]);
    expect(staffActionsFor(cardPaid({ fulfilment_status: "ready" }))).toEqual(["hand_over"]);
    expect(staffActionsFor(order({ payment_method: "card" }))).toEqual([]);
    expect(staffActionsFor(cardPaid({ fulfilment_status: "completed" }))).toEqual([]);
  });

  it("customer status labels", () => {
    const label = (o: FlowOrder) => customerStatus(o).label;
    expect(label(order({ payment_method: "card" }))).toBe("Waiting for payment");
    expect(label(order())).toBe("Reserved");
    expect(label(cardPaid())).toBe("Paid");
    expect(label(order({ fulfilment_status: "ready" }))).toBe("Ready to collect");
    expect(customerStatus(order({ fulfilment_status: "ready" })).tone).toBe("ready");
    expect(label(cardPaid({ fulfilment_status: "completed" }))).toBe("Picked up");
    expect(label(order({ fulfilment_status: "released" }))).toBe("Released");
    expect(label(order({ payment_method: "card", fulfilment_status: "cancelled" }))).toBe("Cancelled");
    expect(label(cardPaid({ payment_status: "refunded", fulfilment_status: "cancelled" }))).toBe("Refunded");
    expect(label(shipped())).toBe("Shipped");
    expect(label(shipping())).toBe("Packing");
    expect(label(shipping({ fulfilment_status: "completed" }))).toBe("Delivered");
  });

  it("staff queues", () => {
    expect(staffQueue(order({ payment_method: "card" }))).toBe("hidden");
    expect(staffQueue(order())).toBe("to_pack");
    expect(staffQueue(cardPaid())).toBe("to_pack");
    expect(staffQueue(order({ fulfilment_status: "ready" }))).toBe("ready");
    expect(staffQueue(shipped())).toBe("shipped");
    expect(staffQueue(shipping())).toBe("to_pack");
    expect(staffQueue(cardPaid({ fulfilment_status: "completed" }))).toBe("completed");
    expect(staffQueue(order({ fulfilment_status: "released" }))).toBe("closed");
    expect(staffQueue(cardPaid({ payment_status: "refunded", fulfilment_status: "cancelled" }))).toBe("closed");
    expect(isUnpaidReservation(order({ fulfilment_status: "ready" }))).toBe(true);
    expect(isUnpaidReservation(cardPaid())).toBe(false);
  });

  it("customers can cancel only an unpaid reservation not yet collected", () => {
    expect(customerCanCancel(order())).toBe(true);
    expect(customerCanCancel(order({ fulfilment_status: "ready" }))).toBe(true);
    expect(customerCanCancel(cardPaid())).toBe(false);
    expect(customerCanCancel(order({ payment_method: "card" }))).toBe(false);
    expect(customerCanCancel(order({ fulfilment_status: "released" }))).toBe(false);
  });
});

describe("needsActionCount (the sidebar's Store orders badge)", () => {
  it("counts orders to pack plus reservations whose hold ends within a day", () => {
    const now = new Date("2026-11-26T15:00:00Z"); // Thu 9 AM Houston
    expect(
      needsActionCount(
        [
          order(), // reservation to pack
          cardPaid(), // paid card order to pack
          order({ payment_method: "card" }), // still at Stripe: not counted
          order({ fulfilment_status: "ready", hold_until: "2026-11-27T05:59:59.999Z" }), // ends tonight
          order({ fulfilment_status: "ready", hold_until: "2026-11-30T05:59:59.999Z" }), // days left
          cardPaid({ fulfilment_status: "ready" }), // waiting, nothing to do
          cardPaid({ fulfilment_status: "completed" }),
        ],
        now,
      ),
    ).toBe(3);
  });
});

describe("successHeading (never states something untrue)", () => {
  it("names the order's real state", () => {
    expect(successHeading(order({ payment_method: "card" }))).toBe("Almost there");
    expect(successHeading(order())).toBe("Reserved for pickup");
    expect(successHeading(order({ fulfilment_status: "ready" }))).toBe("Reserved for pickup");
    expect(successHeading(cardPaid())).toBe("You're all set");
    expect(successHeading(order({ fulfilment_status: "released" }))).toBe("Reservation released");
    expect(successHeading(order({ payment_method: "card", fulfilment_status: "cancelled" }))).toBe("Order cancelled");
    expect(successHeading(cardPaid({ payment_status: "refunded", fulfilment_status: "cancelled" }))).toBe("Order refunded");
    expect(successHeading(cardPaid({ fulfilment_status: "completed" }))).toBe("Picked up");
  });
});

describe("shipping orders", () => {
  it("is a shipping order when the fulfilment method is delivery", () => {
    expect(isShippingOrder(shipping())).toBe(true);
    expect(isShippingOrder(cardPaid())).toBe(false);
  });

  it("refuses every pickup action on a shipping order", () => {
    for (const a of ["mark_ready", "hand_over", "take_payment"] as const) {
      expect(() => applyStaffAction(shipping(), a, { ...ctx, paidVia: "cash" }), a).toThrow("This is a shipping order.");
      expect(() => applyStaffAction(shipped(), a, { ...ctx, paidVia: "cash" }), a).toThrow("This is a shipping order.");
    }
  });

  it("mark_shipped records the tracking number and moves it to shipped", () => {
    expect(applyStaffAction(shipping(), "mark_shipped", { ...ctx, trackingNumber: "  9400 1118 99 " })).toEqual({
      fulfilment_status: "out_for_delivery",
      shipped_at: NOW.toISOString(),
      tracking_number: "9400 1118 99",
      carrier: "USPS",
      tracking_url: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400%201118%2099",
    });
  });

  it("mark_shipped needs a tracking number, a paid shipping order, and a new order", () => {
    expect(() => applyStaffAction(shipping(), "mark_shipped", { ...ctx, trackingNumber: "   " })).toThrow("Enter the tracking number.");
    expect(() => applyStaffAction(shipping(), "mark_shipped", { ...ctx, trackingNumber: "x".repeat(65) })).toThrow();
    expect(() => applyStaffAction(cardPaid(), "mark_shipped", { ...ctx, trackingNumber: "94" })).toThrow();
    expect(() => applyStaffAction(shipping({ payment_status: "unpaid" }), "mark_shipped", { ...ctx, trackingNumber: "94" })).toThrow();
    expect(() => applyStaffAction(shipped(), "mark_shipped", { ...ctx, trackingNumber: "94" })).toThrow();
  });

  it("mark_delivered only from shipped", () => {
    expect(() => applyStaffAction(shipping(), "mark_delivered", ctx)).toThrow();
    expect(() => applyStaffAction(cardPaid({ fulfilment_status: "ready" }), "mark_delivered", ctx)).toThrow();
  });

  it("staff see Mark shipped, then Mark delivered", () => {
    expect(staffActionsFor(shipping())).toEqual(["mark_shipped"]);
    expect(staffActionsFor(shipped())).toEqual(["mark_delivered"]);
    expect(staffActionsFor(shipping({ fulfilment_status: "completed" }))).toEqual([]);
    expect(staffActionsFor(shipping({ payment_status: "unpaid" }))).toEqual([]);
    // Pickup is unchanged.
    expect(staffActionsFor(cardPaid())).toEqual(["mark_ready", "hand_over"]);
  });

  it("builds a USPS tracking link", () => {
    expect(uspsTrackingUrl("9400111899")).toBe("https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899");
  });

  it("a paid shipping order waiting for its label needs action", () => {
    expect(needsActionCount([shipping(), shipped()], NOW)).toBe(1);
  });
});
