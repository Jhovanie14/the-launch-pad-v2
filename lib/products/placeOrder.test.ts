import { describe, expect, it, vi } from "vitest";
import { placeOrder } from "./placeOrder";

const NOW = new Date("2026-11-24T16:00:00Z");
const PRODUCT = { id: "p1", name: "Wheel brush", price: 17.84, sale_price: null, stock: 5, is_active: true };

/** Just enough of the Supabase client for placeOrder: reads, updates and rpc. */
function fakeDb(opts: { openReservation?: { id: string } | null; rpcError?: string } = {}) {
  const calls = { rpc: [] as { fn: string; args: unknown }[], updates: [] as { values: unknown; eq: [string, unknown][] }[] };
  const db = {
    from(table: string) {
      if (table === "products") {
        return { select: () => ({ in: async () => ({ data: [PRODUCT], error: null }) }) };
      }
      // product_orders
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: opts.openReservation ?? null, error: null }),
        update: (values: unknown) => {
          const rec = { values, eq: [] as [string, unknown][] };
          calls.updates.push(rec);
          const u: any = { eq: (c: string, v: unknown) => (rec.eq.push([c, v]), u), then: (r: any) => r({ error: null }) };
          return u;
        },
      };
      return chain;
    },
    rpc: vi.fn(async (fn: string, args: unknown) => {
      calls.rpc.push({ fn, args });
      if (fn === "place_product_order") {
        return opts.rpcError
          ? { data: null, error: { message: opts.rpcError } }
          : { data: "1a2b3c4d-0000-4000-8000-000000000000", error: null };
      }
      return { data: null, error: null };
    }),
  };
  return { db, calls };
}

function deps(db: unknown, stripeCreate = vi.fn(async () => ({ id: "cs_1", url: "https://stripe.test/cs_1" }))) {
  return {
    db: db as never,
    stripe: { checkout: { sessions: { create: stripeCreate } } } as never,
    siteUrl: "https://site.test",
    now: NOW,
    pickupHours: "Daily 9–6",
    sendReserved: vi.fn(async () => {}),
  };
}

const input = (paymentMethod: string) => ({
  userId: "u1",
  email: "dee@example.com",
  name: "Dee",
  phone: "7135550142",
  items: [{ productId: "p1", quantity: 1 }],
  fulfillmentMethod: "pickup",
  paymentMethod,
});

describe("placeOrder: pay at the store", () => {
  it("refuses a second reservation, naming the first", async () => {
    const { db, calls } = fakeDb({ openReservation: { id: "9f7e21c0-0000-4000-8000-000000000000" } });
    await expect(placeOrder(deps(db), input("at_store"))).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("9F7E21C0"),
    });
    expect(calls.rpc).toEqual([]);
  });

  it("reserves with held stock, emails, and never calls Stripe", async () => {
    const { db, calls } = fakeDb();
    const d = deps(db);
    const out = await placeOrder(d, input("at_store"));
    expect(calls.rpc[0]).toMatchObject({
      fn: "place_product_order",
      args: { p_user_id: "u1", p_payment_method: "at_store", p_phone: "7135550142", p_total: 17.84 },
    });
    expect(d.sendReserved).toHaveBeenCalledWith(
      expect.objectContaining({ to: "dee@example.com", total: 17.84, pickupHours: "Daily 9–6" }),
    );
    expect(out.url).toBe("/products/success?order=1a2b3c4d-0000-4000-8000-000000000000");
    expect((d.stripe as any).checkout.sessions.create).not.toHaveBeenCalled();
  });
});

describe("placeOrder: pay by card", () => {
  it("opens a Stripe session that expires after at least 31 minutes", async () => {
    const { db, calls } = fakeDb();
    const create = vi.fn(async () => ({ id: "cs_1", url: "https://stripe.test/cs_1" }));
    const out = await placeOrder(deps(db, create), input("card"));
    const params = (create.mock.calls[0] as any)[0];
    expect(params.expires_at).toBeGreaterThanOrEqual(Math.floor(NOW.getTime() / 1000) + 31 * 60);
    expect(params.metadata).toEqual({ payment_type: "product_order", order_id: "1a2b3c4d-0000-4000-8000-000000000000" });
    expect(calls.updates.some((u) => (u.values as any).stripe_session_id === "cs_1")).toBe(true);
    expect(out.url).toBe("https://stripe.test/cs_1");
  });

  it("returns the stock and cancels the order when Stripe fails", async () => {
    const { db, calls } = fakeDb();
    const create = vi.fn(async () => {
      throw new Error("stripe down");
    });
    await expect(placeOrder(deps(db, create), input("card"))).rejects.toThrow("stripe down");
    expect(calls.rpc.map((c) => c.fn)).toEqual(["place_product_order", "release_product_order_stock"]);
    expect(calls.updates.some((u) => (u.values as any).fulfilment_status === "cancelled")).toBe(true);
  });
});

describe("placeOrder: errors", () => {
  it("names the product that ran out", async () => {
    const { db } = fakeDb({ rpcError: "insufficient_stock:Wheel brush" });
    await expect(placeOrder(deps(db), input("at_store"))).rejects.toMatchObject({
      status: 400,
      message: "Not enough stock for Wheel brush",
    });
  });

  it("refuses an unknown payment method", async () => {
    const { db } = fakeDb();
    await expect(placeOrder(deps(db), input("bitcoin"))).rejects.toMatchObject({ status: 400, message: "Choose how to pay" });
  });
});
