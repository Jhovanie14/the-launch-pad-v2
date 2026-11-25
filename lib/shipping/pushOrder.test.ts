import { describe, expect, it, vi } from "vitest";
import { fakeDb } from "./__fixtures__/fakeDb";
import { pushOrderToShippo } from "./pushOrder";

const ID = "b81e0d44-0000-4000-8000-000000000000";
const ADDRESS = { name: "Dee Jones", street1: "215 CLAYTON ST", street2: "Apt 4", city: "San Francisco", state: "CA", zip: "94117-2214", phone: "4155550100" };

function setup(order: Record<string, unknown> = {}, shippo = vi.fn(async () => ({ object_id: "so_1" }))) {
  const { db, tables } = fakeDb({
    product_orders: [
      {
        id: ID,
        user_id: "u1",
        fulfillment_method: "delivery",
        payment_status: "paid",
        fulfilment_status: "placed",
        delivery_address: ADDRESS,
        delivery_fee: 8.08,
        shipping_service: "USPS Ground Advantage",
        total: 22.77,
        paid_at: "2026-11-25T16:00:00.000Z",
        shippo_order_id: null,
        shippo_push_error: null,
        ...order,
      },
    ],
    product_order_items: [{ order_id: ID, product_id: "p1", name: "Utility towels, 8-pack", quantity: 1, unit_price: 14.69 }],
    products: [{ id: "p1", weight_oz: 16 }],
    profiles: [{ id: "u1", email: "dee@example.com" }],
  });
  return { db, tables, shippo };
}

describe("pushOrderToShippo", () => {
  it("creates the Shippo order and remembers its id", async () => {
    const { db, tables, shippo } = setup();
    expect(await pushOrderToShippo({ db, shippo }, ID)).toEqual({ ok: true });
    expect(shippo).toHaveBeenCalledTimes(1);
    const [method, path, body] = shippo.mock.calls[0] as unknown as [string, string, any];
    expect([method, path]).toEqual(["POST", "/orders/"]);
    expect(body).toMatchObject({
      order_number: "B81E0D44",
      order_status: "PAID",
      placed_at: "2026-11-25T16:00:00.000Z",
      to_address: { name: "Dee Jones", street1: "215 CLAYTON ST", street2: "Apt 4", city: "San Francisco", state: "CA", zip: "94117-2214", country: "US", phone: "4155550100", email: "dee@example.com" },
      line_items: [{ title: "Utility towels, 8-pack", quantity: 1, total_price: "14.69", currency: "USD", weight: "16", weight_unit: "oz" }],
      weight: "16",
      weight_unit: "oz",
      shipping_cost: "8.08",
      shipping_cost_currency: "USD",
      shipping_method: "USPS Ground Advantage",
    });
    expect(body.from_address.city).toBe("Houston");
    expect(tables.product_orders[0].shippo_order_id).toBe("so_1");
  });

  it("records the error and never throws when Shippo fails", async () => {
    const failing = vi.fn(async () => {
      throw new Error("Shippo request failed (500)");
    });
    const { db, tables } = setup({}, failing as never);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await pushOrderToShippo({ db, shippo: failing }, ID)).toEqual({ ok: false });
    expect(tables.product_orders[0].shippo_order_id).toBeNull();
    expect(tables.product_orders[0].shippo_push_error).toBe("Shippo request failed (500)");
    spy.mockRestore();
  });

  it("skips an order already in Shippo, unpaid, pickup or closed", async () => {
    for (const over of [
      { shippo_order_id: "so_0" },
      { payment_status: "unpaid" },
      { fulfillment_method: "pickup" },
      { fulfilment_status: "cancelled" },
    ]) {
      const { db, shippo } = setup(over);
      expect(await pushOrderToShippo({ db, shippo }, ID), JSON.stringify(over)).toEqual({ ok: false, skipped: true });
      expect(shippo).not.toHaveBeenCalled();
    }
  });
});
