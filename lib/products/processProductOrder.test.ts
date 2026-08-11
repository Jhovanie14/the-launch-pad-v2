import { describe, expect, it } from "vitest";
import {
  processProductOrderCompleted,
  processProductOrderExpired,
} from "./processProductOrder";

const ORDER = {
  id: "order-1",
  user_id: "user-1",
  status: "pending",
  fulfillment_method: "delivery",
  subtotal: 39.98,
  delivery_fee: 7.5,
  total: 47.48,
};

const ITEMS = [
  { id: "i1", order_id: "order-1", product_id: "p1", name: "Tire Shine Pro", unit_price: 19.99, quantity: 2 },
  { id: "i2", order_id: "order-1", product_id: null, name: "Deleted product", unit_price: 5, quantity: 1 },
];

function fakeDb(opts: {
  order?: any;
  items?: any[];
  stocks?: Record<string, number>;
}) {
  const state = {
    orderUpdates: [] as any[],
    stockUpdates: {} as Record<string, number>,
  };
  const db = {
    from(table: string) {
      if (table === "product_orders") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.order ?? null, error: null }),
            }),
          }),
          update: (values: any) => {
            const filters: Record<string, unknown> = {};
            let recorded = false;
            const chain = {
              eq(col: string, val: unknown) {
                filters[col] = val;
                return chain;
              },
              then(resolve: (v: { error: null }) => void) {
                if (!recorded) {
                  state.orderUpdates.push({ values, filters });
                  recorded = true;
                }
                resolve({ error: null });
              },
            };
            return chain;
          },
        };
      }
      if (table === "product_order_items") {
        return {
          select: () => ({
            eq: async () => ({ data: opts.items ?? [], error: null }),
          }),
        };
      }
      if (table === "products") {
        return {
          select: () => ({
            eq: (_c: string, id: string) => ({
              maybeSingle: async () => ({
                data:
                  opts.stocks && id in opts.stocks
                    ? { stock: opts.stocks[id] }
                    : null,
                error: null,
              }),
            }),
          }),
          update: (values: { stock: number }) => ({
            eq: async (_c: string, id: string) => {
              state.stockUpdates[id] = values.stock;
              return { error: null };
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as any;
  return { db, state };
}

const SESSION = {
  metadata: { payment_type: "product_order", order_id: "order-1" },
  payment_intent: "pi_123",
  customer_details: { phone: "+18325551234" },
  collected_information: {
    shipping_details: {
      name: "Jho F",
      address: { line1: "1 Main St", city: "Houston", state: "TX", postal_code: "77025", country: "US" },
    },
  },
};

describe("processProductOrderCompleted", () => {
  it("marks the order paid with intent, phone, and address, and decrements stock", async () => {
    const { db, state } = fakeDb({ order: ORDER, items: ITEMS, stocks: { p1: 10 } });
    const result = await processProductOrderCompleted(db, SESSION as any);

    expect(result?.order.status).toBe("paid");
    expect(result?.items).toHaveLength(2);
    expect(state.orderUpdates[0].values).toMatchObject({
      status: "paid",
      stripe_payment_intent_id: "pi_123",
      phone: "+18325551234",
    });
    expect(state.orderUpdates[0].values.delivery_address).toMatchObject({
      name: "Jho F",
    });
    // p1: 10 - 2 = 8; the null-product item is skipped without error
    expect(state.stockUpdates).toEqual({ p1: 8 });
  });

  it("floors stock at zero", async () => {
    const { db, state } = fakeDb({ order: ORDER, items: ITEMS, stocks: { p1: 1 } });
    await processProductOrderCompleted(db, SESSION as any);
    expect(state.stockUpdates).toEqual({ p1: 0 });
  });

  it("reads legacy session.shipping_details when collected_information is absent", async () => {
    const { db, state } = fakeDb({ order: ORDER, items: [], stocks: {} });
    const legacy = {
      ...SESSION,
      collected_information: undefined,
      shipping_details: { name: "Legacy", address: { line1: "2 Oak" } },
    };
    await processProductOrderCompleted(db, legacy as any);
    expect(state.orderUpdates[0].values.delivery_address).toMatchObject({ name: "Legacy" });
  });

  it("returns null and touches nothing when order is missing or already paid", async () => {
    const missing = fakeDb({ order: null });
    expect(await processProductOrderCompleted(missing.db, SESSION as any)).toBeNull();
    expect(missing.state.orderUpdates).toHaveLength(0);

    const paid = fakeDb({ order: { ...ORDER, status: "paid" }, stocks: { p1: 10 } });
    expect(await processProductOrderCompleted(paid.db, SESSION as any)).toBeNull();
    expect(paid.state.orderUpdates).toHaveLength(0);
    expect(paid.state.stockUpdates).toEqual({});
  });

  it("returns null when metadata has no order_id", async () => {
    const { db, state } = fakeDb({ order: ORDER });
    expect(await processProductOrderCompleted(db, { metadata: {} } as any)).toBeNull();
    expect(state.orderUpdates).toHaveLength(0);
  });
});

describe("processProductOrderExpired", () => {
  it("cancels the order filtered to pending status", async () => {
    const { db, state } = fakeDb({ order: ORDER });
    await processProductOrderExpired(db, SESSION as any);
    expect(state.orderUpdates).toHaveLength(1);
    expect(state.orderUpdates[0].values).toMatchObject({ status: "cancelled" });
    expect(state.orderUpdates[0].filters).toMatchObject({
      id: "order-1",
      status: "pending",
    });
  });

  it("does nothing without an order_id", async () => {
    const { db, state } = fakeDb({});
    await processProductOrderExpired(db, { metadata: {} } as any);
    expect(state.orderUpdates).toHaveLength(0);
  });
});
