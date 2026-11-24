import { describe, expect, it, vi } from "vitest";
import { cancelReservation } from "./cancelReservation";

const NOW = new Date("2026-11-24T16:00:00Z");
const ID = "1a2b3c4d-0000-4000-8000-000000000000";
const RESERVATION = {
  id: ID,
  user_id: "u1",
  payment_method: "at_store",
  payment_status: "unpaid",
  fulfilment_status: "ready",
  fulfillment_method: "pickup",
  hold_until: "2026-11-27T05:59:59.999Z",
  total: 25.2,
};

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
      throw new Error(table);
    },
    async rpc(fn: string) {
      state.rpc.push(fn);
      return { data: null, error: null };
    },
  } as any;
  return { db, state };
}

const run = (order: any, userId = "u1", opts = {}) => {
  const { db, state } = fakeDb(order, opts);
  const released = vi.fn(async () => {});
  const p = cancelReservation({ db, now: NOW, emails: { released } }, { userId, orderId: ID });
  return { p, state, released };
};

describe("cancelReservation", () => {
  it("releases the customer's unpaid reservation, once", async () => {
    const { p, state, released } = run(RESERVATION);
    await p;
    expect(state.updates[0].values).toMatchObject({ fulfilment_status: "released", released_at: NOW.toISOString() });
    expect(state.updates[0].filters).toEqual({ id: ID, fulfilment_status: "ready", payment_status: "unpaid" });
    expect(state.rpc).toEqual(["release_product_order_stock"]);
    expect(released).toHaveBeenCalledWith(expect.objectContaining({ to: "dee@example.com", byCustomer: true }));
  });

  it("works before the order is marked ready", async () => {
    const { p, state } = run({ ...RESERVATION, fulfilment_status: "placed" });
    await p;
    expect(state.rpc).toEqual(["release_product_order_stock"]);
  });

  it("refuses someone else's order", async () => {
    const { p, state } = run(RESERVATION, "u2");
    await expect(p).rejects.toMatchObject({ status: 400 });
    expect(state.updates).toHaveLength(0);
  });

  it("refuses a card order and a completed order", async () => {
    await expect(run({ ...RESERVATION, payment_method: "card" }).p).rejects.toMatchObject({ status: 400 });
    await expect(run({ ...RESERVATION, payment_status: "paid", fulfilment_status: "completed" }).p).rejects.toMatchObject({ status: 400 });
  });

  it("a lost race (staff took payment first) moves no stock", async () => {
    const { p, state, released } = run(RESERVATION, "u1", { updateMatches: false });
    await expect(p).rejects.toMatchObject({ status: 409 });
    expect(state.rpc).toEqual([]);
    expect(released).not.toHaveBeenCalled();
  });
});
