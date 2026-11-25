import { describe, expect, it, vi } from "vitest";
import { refundOrder } from "./refundOrder";
import { releaseStock, runStaffAction } from "./staffActions";

const NOW = new Date("2026-11-23T16:00:00Z"); // Mon 10 AM Houston
const ID = "1a2b3c4d-0000-4000-8000-000000000000";

const RESERVATION = {
  id: ID,
  user_id: "u1",
  payment_method: "at_store",
  payment_status: "unpaid",
  fulfilment_status: "placed",
  fulfillment_method: "pickup",
  hold_until: null,
  paid_via: null,
  stripe_payment_intent_id: null,
  total: 25.2,
};
const CARD_PAID = { ...RESERVATION, payment_method: "card", payment_status: "paid", paid_via: "stripe", stripe_payment_intent_id: "pi_1" };

function fakeDb(order: any, opts: { updateMatches?: boolean } = {}) {
  const state = { updates: [] as { values: any; filters: Record<string, unknown> }[], rpc: [] as string[] };
  const db = {
    from(table: string) {
      if (table === "product_orders") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: order, error: null }) }) }),
          update: (values: any) => {
            const rec = { values, filters: {} as Record<string, unknown> };
            state.updates.push(rec);
            const chain: any = {
              eq: (c: string, v: unknown) => ((rec.filters[c] = v), chain),
              select: async () => ({ data: opts.updateMatches === false ? [] : [{ id: ID }], error: null }),
            };
            return chain;
          },
        };
      }
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { email: "dee@example.com", full_name: "Dee" }, error: null }) }) }) };
      }
      if (table === "product_order_items") {
        return { select: () => ({ eq: async () => ({ data: [{ name: "Wheel brush", quantity: 1, unit_price: 25.2 }], error: null }) }) };
      }
      throw new Error(table);
    },
    async rpc(fn: string) {
      state.rpc.push(fn);
      return { data: null, error: null };
    },
  } as any;
  return { db, state };
}

const emails = () => ({
  ready: vi.fn(async () => {}),
  collected: vi.fn(async () => {}),
  released: vi.fn(async () => {}),
  refunded: vi.fn(async () => {}),
});

function deps(db: unknown, e = emails()) {
  return { db: db as never, now: NOW, staffId: "staff-1", holdDays: 3, pickupHours: "Daily 9–6", emails: e };
}

describe("runStaffAction", () => {
  it("mark_ready starts the hold and emails the amount due and the date", async () => {
    const { db, state } = fakeDb(RESERVATION);
    const e = emails();
    await runStaffAction(deps(db, e), { orderId: ID, action: "mark_ready" });
    expect(state.updates[0].values).toMatchObject({ fulfilment_status: "ready", hold_until: "2026-11-27T05:59:59.999Z" });
    expect(state.updates[0].filters).toEqual({ id: ID, fulfilment_status: "placed", payment_status: "unpaid" });
    expect(e.ready).toHaveBeenCalledWith(
      expect.objectContaining({ to: "dee@example.com", amountDue: 25.2, holdDate: "Thu, Nov 26", pickupHours: "Daily 9–6" }),
    );
  });

  it("mark_ready on a paid order has nothing due", async () => {
    const { db } = fakeDb(CARD_PAID);
    const e = emails();
    await runStaffAction(deps(db, e), { orderId: ID, action: "mark_ready" });
    expect(e.ready).toHaveBeenCalledWith(expect.objectContaining({ amountDue: null, holdDate: null }));
  });

  it("take_payment with cash completes it and sends a receipt", async () => {
    const { db, state } = fakeDb({ ...RESERVATION, fulfilment_status: "ready" });
    const e = emails();
    await runStaffAction(deps(db, e), { orderId: ID, action: "take_payment", paidVia: "cash" });
    expect(state.updates[0].values).toMatchObject({ payment_status: "paid", paid_via: "cash", fulfilment_status: "completed" });
    expect(e.collected).toHaveBeenCalledWith(expect.objectContaining({ paidVia: "cash", total: 25.2 }));
  });

  it("hand_over sends a receipt paid by card online", async () => {
    const { db } = fakeDb({ ...CARD_PAID, fulfilment_status: "ready" });
    const e = emails();
    await runStaffAction(deps(db, e), { orderId: ID, action: "hand_over" });
    expect(e.collected).toHaveBeenCalledWith(expect.objectContaining({ paidVia: "stripe" }));
  });

  it("release returns the stock and emails the customer", async () => {
    const { db, state } = fakeDb({ ...RESERVATION, fulfilment_status: "ready" });
    const e = emails();
    await runStaffAction(deps(db, e), { orderId: ID, action: "release" });
    expect(state.updates[0].values).toMatchObject({ fulfilment_status: "released" });
    expect(state.rpc).toEqual(["release_product_order_stock"]);
    expect(e.released).toHaveBeenCalledWith(expect.objectContaining({ byCustomer: false }));
  });

  it("a lost race is a 409 with no stock moved and no email", async () => {
    const { db, state } = fakeDb({ ...RESERVATION, fulfilment_status: "ready" }, { updateMatches: false });
    const e = emails();
    await expect(runStaffAction(deps(db, e), { orderId: ID, action: "release" })).rejects.toMatchObject({ status: 409 });
    expect(state.rpc).toEqual([]);
    expect(e.released).not.toHaveBeenCalled();
  });

  it("hand_over on an unpaid order is refused", async () => {
    const { db, state } = fakeDb({ ...RESERVATION, fulfilment_status: "ready" });
    await expect(runStaffAction(deps(db), { orderId: ID, action: "hand_over" })).rejects.toMatchObject({ status: 400 });
    expect(state.updates).toHaveLength(0);
  });

  it("a missing order is a 404", async () => {
    const { db } = fakeDb(null);
    await expect(runStaffAction(deps(db), { orderId: ID, action: "mark_ready" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("refundOrder", () => {
  const stripe = () => ({ refunds: { create: vi.fn(async () => ({ id: "re_1" })) } });

  it("refunds a card order through Stripe and returns stock not yet handed over", async () => {
    const { db, state } = fakeDb({ ...CARD_PAID, fulfilment_status: "ready" });
    const s = stripe();
    const e = emails();
    await refundOrder({ db, stripe: s as never, now: NOW, emails: e }, ID);
    expect(s.refunds.create).toHaveBeenCalledWith({ payment_intent: "pi_1" });
    expect(state.updates[0].values).toMatchObject({ payment_status: "refunded", fulfilment_status: "cancelled" });
    expect(state.rpc).toEqual(["release_product_order_stock"]);
    expect(e.refunded).toHaveBeenCalledWith(expect.objectContaining({ where: "card", total: 25.2 }));
  });

  it("records a store refund without Stripe", async () => {
    const { db } = fakeDb({ ...RESERVATION, payment_status: "paid", paid_via: "cash", fulfilment_status: "ready" });
    const s = stripe();
    const e = emails();
    await refundOrder({ db, stripe: s as never, now: NOW, emails: e }, ID);
    expect(s.refunds.create).not.toHaveBeenCalled();
    expect(e.refunded).toHaveBeenCalledWith(expect.objectContaining({ where: "store" }));
  });

  it("records a Zelle refund as a store refund, never through Stripe", async () => {
    const { db } = fakeDb({ ...RESERVATION, payment_status: "paid", paid_via: "zelle", fulfilment_status: "completed" });
    const s = stripe();
    const e = emails();
    await refundOrder({ db, stripe: s as never, now: NOW, emails: e }, ID);
    expect(s.refunds.create).not.toHaveBeenCalled();
    expect(e.refunded).toHaveBeenCalledWith(expect.objectContaining({ where: "store" }));
  });

  it("keeps stock out for an order already handed over", async () => {
    const { db, state } = fakeDb({ ...CARD_PAID, fulfilment_status: "completed" });
    await refundOrder({ db, stripe: stripe() as never, now: NOW, emails: emails() }, ID);
    expect(state.updates[0].values).toMatchObject({ payment_status: "refunded", fulfilment_status: "completed" });
    expect(state.rpc).toEqual([]);
  });

  it("refuses an unpaid order", async () => {
    const { db } = fakeDb(RESERVATION);
    await expect(refundOrder({ db, stripe: stripe() as never, now: NOW, emails: emails() }, ID)).rejects.toMatchObject({ status: 400 });
  });
});

describe("releaseStock", () => {
  it("logs a failed stock return loudly instead of failing silently", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = { rpc: async () => ({ data: null, error: { message: "network" } }) } as never;
    expect(await releaseStock(db, "order-9")).toBe(false);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("order-9"), expect.anything());
    spy.mockRestore();
  });
  it("returns true when the stock came back", async () => {
    const db = { rpc: async () => ({ data: null, error: null }) } as never;
    expect(await releaseStock(db, "order-9")).toBe(true);
  });
});
