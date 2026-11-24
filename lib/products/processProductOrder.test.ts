import { describe, expect, it } from "vitest";
import {
  processProductOrderCompleted,
  processProductOrderExpired,
} from "./processProductOrder";

const NOW = new Date("2026-11-24T16:00:00Z");

const ORDER = {
  id: "order-1",
  user_id: "user-1",
  status: "pending",
  payment_method: "card",
  payment_status: "unpaid",
  fulfilment_status: "placed",
  fulfillment_method: "pickup",
  stock_taken: true,
  phone: null,
  subtotal: 39.98,
  delivery_fee: 0,
  total: 39.98,
};

const ITEMS = [{ id: "i1", order_id: "order-1", product_id: "p1", name: "Tire Shine Pro", unit_price: 19.99, quantity: 2 }];

function fakeDb(opts: { order?: any; items?: any[]; updateMatches?: boolean; readError?: boolean; updateError?: boolean; rpcError?: boolean }) {
  const state = {
    updates: [] as { values: any; filters: Record<string, unknown> }[],
    rpc: [] as { fn: string; args: any }[],
  };
  const db = {
    from(table: string) {
      if (table === "product_orders") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                opts.readError ? { data: null, error: { message: "read failed" } } : { data: opts.order ?? null, error: null },
            }),
          }),
          update: (values: any) => {
            const rec = { values, filters: {} as Record<string, unknown> };
            state.updates.push(rec);
            const matched = opts.updateMatches === false ? [] : [{ id: "order-1" }];
            const chain: any = {
              eq(col: string, val: unknown) {
                rec.filters[col] = val;
                return chain;
              },
              select: async () => (opts.updateError ? { data: null, error: { message: "update failed" } } : { data: matched, error: null }),
              then: (resolve: any) => resolve(opts.updateError ? { data: null, error: { message: "update failed" } } : { data: matched, error: null }),
            };
            return chain;
          },
        };
      }
      if (table === "product_order_items") {
        return { select: () => ({ eq: async () => ({ data: opts.items ?? [], error: null }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    },
    async rpc(fn: string, args: any) {
      state.rpc.push({ fn, args });
      return opts.rpcError ? { data: null, error: { message: "rpc failed" } } : { data: null, error: null };
    },
  } as any;
  return { db, state };
}

const SESSION = {
  metadata: { payment_type: "product_order", order_id: "order-1" },
  payment_intent: "pi_123",
  customer_details: { phone: "+18325551234" },
};

describe("processProductOrderCompleted", () => {
  it("marks a waiting card order paid, without touching stock it already holds", async () => {
    const { db, state } = fakeDb({ order: ORDER, items: ITEMS });
    const result = await processProductOrderCompleted(db, SESSION as any, NOW);

    expect(result?.order.payment_status).toBe("paid");
    expect(result?.items).toHaveLength(1);
    expect(state.updates[0].values).toMatchObject({
      payment_status: "paid",
      paid_via: "stripe",
      paid_at: NOW.toISOString(),
      stripe_payment_intent_id: "pi_123",
      phone: "+18325551234",
    });
    expect(state.updates[0].filters).toMatchObject({ id: "order-1", payment_status: "unpaid", fulfilment_status: "placed" });
    expect(state.rpc).toEqual([]);
  });

  it("takes the stock for a legacy order placed before held stock existed", async () => {
    const { db, state } = fakeDb({ order: { ...ORDER, stock_taken: false }, items: ITEMS });
    await processProductOrderCompleted(db, SESSION as any, NOW);
    expect(state.rpc).toEqual([{ fn: "take_product_order_stock", args: { p_order_id: "order-1" } }]);
  });

  it("returns null and changes nothing for an order already paid", async () => {
    const { db, state } = fakeDb({ order: { ...ORDER, payment_status: "paid" } });
    expect(await processProductOrderCompleted(db, SESSION as any, NOW)).toBeNull();
    expect(state.updates).toHaveLength(0);
    expect(state.rpc).toHaveLength(0);
  });

  it("records a payment that arrives after the order was cancelled, and sends nothing", async () => {
    const { db, state } = fakeDb({ order: { ...ORDER, fulfilment_status: "cancelled" } });
    expect(await processProductOrderCompleted(db, SESSION as any, NOW)).toBeNull();
    expect(state.updates[0].values).toMatchObject({ payment_status: "paid", paid_via: "stripe" });
    expect(state.updates[0].values.fulfilment_status).toBeUndefined();
    expect(state.rpc).toHaveLength(0);
  });

  it("returns null when the order is missing or there is no order_id", async () => {
    const missing = fakeDb({ order: null });
    expect(await processProductOrderCompleted(missing.db, SESSION as any, NOW)).toBeNull();
    const noId = fakeDb({ order: ORDER });
    expect(await processProductOrderCompleted(noId.db, { metadata: {} } as any, NOW)).toBeNull();
    expect(noId.state.updates).toHaveLength(0);
  });
});

describe("processProductOrderCompleted: database failures throw so Stripe retries", () => {
  it("throws when the order can't be read", async () => {
    const { db } = fakeDb({ order: ORDER, readError: true });
    await expect(processProductOrderCompleted(db, SESSION as any, NOW)).rejects.toThrow();
  });
  it("throws when the paid update fails, before any email could go out", async () => {
    const { db } = fakeDb({ order: ORDER, items: ITEMS, updateError: true });
    await expect(processProductOrderCompleted(db, SESSION as any, NOW)).rejects.toThrow();
  });
  it("throws when a legacy order's stock can't be taken", async () => {
    const { db } = fakeDb({ order: { ...ORDER, stock_taken: false }, items: ITEMS, rpcError: true });
    await expect(processProductOrderCompleted(db, SESSION as any, NOW)).rejects.toThrow();
  });
  it("a retry after the stock step failed takes the stock without a second email", async () => {
    const { db, state } = fakeDb({ order: { ...ORDER, payment_status: "paid", stock_taken: false } });
    expect(await processProductOrderCompleted(db, SESSION as any, NOW)).toBeNull();
    expect(state.rpc).toEqual([{ fn: "take_product_order_stock", args: { p_order_id: "order-1" } }]);
  });
});

describe("processProductOrderExpired", () => {
  it("throws when the cancel update fails", async () => {
    const { db } = fakeDb({ order: ORDER, updateError: true });
    await expect(processProductOrderExpired(db, SESSION as any, NOW)).rejects.toThrow();
  });

  it("cancels a waiting card order and returns its stock", async () => {
    const { db, state } = fakeDb({ order: ORDER });
    await processProductOrderExpired(db, SESSION as any, NOW);
    expect(state.updates[0].values).toMatchObject({ fulfilment_status: "cancelled" });
    expect(state.updates[0].filters).toMatchObject({
      id: "order-1",
      payment_method: "card",
      payment_status: "unpaid",
      fulfilment_status: "placed",
    });
    expect(state.rpc).toEqual([{ fn: "release_product_order_stock", args: { p_order_id: "order-1" } }]);
  });

  it("does not return stock when the order had already moved on", async () => {
    const { db, state } = fakeDb({ order: ORDER, updateMatches: false });
    await processProductOrderExpired(db, SESSION as any, NOW);
    expect(state.rpc).toHaveLength(0);
  });

  it("does nothing without an order_id", async () => {
    const { db, state } = fakeDb({});
    await processProductOrderExpired(db, { metadata: {} } as any, NOW);
    expect(state.updates).toHaveLength(0);
  });
});
