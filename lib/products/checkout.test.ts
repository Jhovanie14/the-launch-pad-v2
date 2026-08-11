import { describe, expect, it } from "vitest";
import { createPendingOrder, priceOrder } from "./checkout";

const PRODUCTS = [
  { id: "p1", name: "Tire Shine Pro", price: 29.99, sale_price: 19.99, stock: 10, is_active: true },
  { id: "p2", name: "Ceramic Wax", price: 39.99, sale_price: null, stock: 2, is_active: true },
  { id: "p3", name: "Old Formula", price: 9.99, sale_price: null, stock: 5, is_active: false },
];

/** Minimal fake Supabase resolving reads from fixtures (computeBookingAmount pattern). */
function fakeDb(opts: {
  products?: typeof PRODUCTS;
  deliveryFee?: number | null; // null = no settings row
  orderId?: string;
  itemInsertError?: boolean;
}) {
  const calls: { orderInserts: any[]; itemInserts: any[]; orderDeletes: string[] } = {
    orderInserts: [],
    itemInserts: [],
    orderDeletes: [],
  };
  const db = {
    from(table: string) {
      if (table === "products") {
        return {
          select: () => ({
            in: async (_col: string, ids: string[]) => ({
              data: (opts.products ?? PRODUCTS).filter((p) => ids.includes(p.id)),
              error: null,
            }),
          }),
        };
      }
      if (table === "store_settings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.deliveryFee == null ? null : { delivery_fee: opts.deliveryFee },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "product_orders") {
        return {
          insert: (row: any) => {
            calls.orderInserts.push(row);
            return {
              select: () => ({
                single: async () => ({
                  data: { id: opts.orderId ?? "order-1" },
                  error: null,
                }),
              }),
            };
          },
          delete: () => ({
            eq: async (_col: string, id: string) => {
              calls.orderDeletes.push(id);
              return { error: null };
            },
          }),
        };
      }
      if (table === "product_order_items") {
        return {
          insert: async (rows: any[]) => {
            calls.itemInserts.push(rows);
            return {
              error: opts.itemInsertError ? { message: "boom" } : null,
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as any;
  return { db, calls };
}

describe("priceOrder validation", () => {
  it("rejects an empty cart", async () => {
    const { db } = fakeDb({});
    await expect(priceOrder(db, [], "pickup")).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an unknown fulfillment method", async () => {
    const { db } = fakeDb({});
    await expect(
      priceOrder(db, [{ productId: "p1", quantity: 1 }], "teleport"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects non-integer or non-positive quantities", async () => {
    const { db } = fakeDb({});
    await expect(
      priceOrder(db, [{ productId: "p1", quantity: 1.5 }], "pickup"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      priceOrder(db, [{ productId: "p1", quantity: 0 }], "pickup"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects unknown and inactive products", async () => {
    const { db } = fakeDb({});
    await expect(
      priceOrder(db, [{ productId: "ghost", quantity: 1 }], "pickup"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      priceOrder(db, [{ productId: "p3", quantity: 1 }], "pickup"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects quantities above stock, naming the product", async () => {
    const { db } = fakeDb({});
    await expect(
      priceOrder(db, [{ productId: "p2", quantity: 3 }], "pickup"),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Ceramic Wax"),
    });
  });
});

describe("priceOrder totals", () => {
  it("uses sale price when set and full price otherwise", async () => {
    const { db } = fakeDb({ deliveryFee: 7.5 });
    const priced = await priceOrder(
      db,
      [
        { productId: "p1", quantity: 2 }, // 2 x 19.99
        { productId: "p2", quantity: 1 }, // 39.99
      ],
      "pickup",
    );
    expect(priced.subtotal).toBe(79.97);
    expect(priced.deliveryFee).toBe(0);
    expect(priced.total).toBe(79.97);
    expect(priced.items).toEqual([
      { product_id: "p1", name: "Tire Shine Pro", unit_price: 19.99, quantity: 2 },
      { product_id: "p2", name: "Ceramic Wax", unit_price: 39.99, quantity: 1 },
    ]);
  });

  it("adds the delivery fee from store_settings for delivery orders", async () => {
    const { db } = fakeDb({ deliveryFee: 7.5 });
    const priced = await priceOrder(db, [{ productId: "p2", quantity: 1 }], "delivery");
    expect(priced.deliveryFee).toBe(7.5);
    expect(priced.total).toBe(47.49);
  });

  it("treats a missing settings row as free delivery", async () => {
    const { db } = fakeDb({ deliveryFee: null });
    const priced = await priceOrder(db, [{ productId: "p2", quantity: 1 }], "delivery");
    expect(priced.deliveryFee).toBe(0);
    expect(priced.total).toBe(39.99);
  });
});

describe("createPendingOrder", () => {
  const priced = {
    items: [{ product_id: "p1", name: "Tire Shine Pro", unit_price: 19.99, quantity: 2 }],
    subtotal: 39.98,
    deliveryFee: 7.5,
    total: 47.48,
  };

  it("inserts the order row and item snapshots", async () => {
    const { db, calls } = fakeDb({ orderId: "order-9", deliveryFee: 7.5 });
    const result = await createPendingOrder(db, {
      userId: "user-1",
      fulfillmentMethod: "delivery",
      priced,
    });
    expect(result).toEqual({ orderId: "order-9" });
    expect(calls.orderInserts[0]).toMatchObject({
      user_id: "user-1",
      status: "pending",
      fulfillment_method: "delivery",
      subtotal: 39.98,
      delivery_fee: 7.5,
      total: 47.48,
    });
    expect(calls.itemInserts[0]).toEqual([
      {
        order_id: "order-9",
        product_id: "p1",
        name: "Tire Shine Pro",
        unit_price: 19.99,
        quantity: 2,
      },
    ]);
  });

  it("deletes the order row and rethrows when item insert fails", async () => {
    const { db, calls } = fakeDb({ orderId: "order-9", itemInsertError: true });
    await expect(
      createPendingOrder(db, { userId: "user-1", fulfillmentMethod: "pickup", priced }),
    ).rejects.toBeTruthy();
    expect(calls.orderDeletes).toEqual(["order-9"]);
  });
});
