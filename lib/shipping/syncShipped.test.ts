import { describe, expect, it, vi } from "vitest";
import { fakeDb } from "./__fixtures__/fakeDb";
import { syncShippedFromShippo } from "./syncShipped";

const ID = "b81e0d44-0000-4000-8000-000000000000";
const NOW = new Date("2026-11-26T15:00:00Z");
const ADDRESS = { name: "Dee Jones", street1: "215 CLAYTON ST", city: "San Francisco", state: "CA", zip: "94117", phone: "4155550100" };

function setup(transactions: unknown[] = [{ object_id: "tx_1" }], txStatus = "SUCCESS", order: Record<string, unknown> = {}) {
  const { db, tables } = fakeDb({
    product_orders: [
      {
        id: ID,
        user_id: "u1",
        fulfillment_method: "delivery",
        payment_status: "paid",
        fulfilment_status: "placed",
        delivery_address: ADDRESS,
        shippo_order_id: "so_1",
        ...order,
      },
    ],
    profiles: [{ id: "u1", email: "dee@example.com", full_name: "Dee" }],
  });
  const shippo = vi.fn(async (_m: string, path: string) => {
    if (path === "/orders/so_1") return { object_id: "so_1", transactions };
    if (path === "/transactions/tx_1") {
      return {
        object_id: "tx_1",
        status: txStatus,
        order: "so_1",
        tracking_number: "9400111899",
        tracking_url_provider: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899",
        label_url: "https://shippo.test/label.pdf",
      };
    }
    throw new Error("unexpected " + path);
  });
  const sendShipped = vi.fn(async () => {});
  return { db, tables, shippo, sendShipped };
}

describe("syncShippedFromShippo", () => {
  it("moves a paid shipping order to Shipped with the label's tracking, and emails once", async () => {
    const { db, tables, shippo, sendShipped } = setup();
    expect(await syncShippedFromShippo({ db, shippo, sendShipped, now: NOW }, ID)).toBe("shipped");
    expect(tables.product_orders[0]).toMatchObject({
      fulfilment_status: "out_for_delivery",
      tracking_number: "9400111899",
      tracking_url: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899",
      carrier: "USPS",
      label_url: "https://shippo.test/label.pdf",
      shipped_at: NOW.toISOString(),
    });
    expect(sendShipped).toHaveBeenCalledWith({
      to: "dee@example.com",
      name: "Dee",
      orderId: ID,
      trackingNumber: "9400111899",
      trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899",
      carrier: "USPS",
      address: ADDRESS,
    });

    expect(await syncShippedFromShippo({ db, shippo, sendShipped, now: NOW }, ID)).toBe("skipped");
    expect(sendShipped).toHaveBeenCalledTimes(1);
  });

  it("waits while no label has been bought", async () => {
    const { db, tables, shippo, sendShipped } = setup([]);
    expect(await syncShippedFromShippo({ db, shippo, sendShipped, now: NOW }, ID)).toBe("waiting");
    expect(tables.product_orders[0].fulfilment_status).toBe("placed");
  });

  it("waits while the label is still being made or failed", async () => {
    const { db, shippo, sendShipped } = setup([{ object_id: "tx_1" }], "ERROR");
    expect(await syncShippedFromShippo({ db, shippo, sendShipped, now: NOW }, ID)).toBe("waiting");
    expect(sendShipped).not.toHaveBeenCalled();
  });

  it("skips orders that aren't in Shippo or aren't waiting to ship", async () => {
    for (const over of [{ shippo_order_id: null }, { fulfillment_method: "pickup" }, { fulfilment_status: "completed" }]) {
      const { db, shippo, sendShipped } = setup(undefined, undefined, over);
      expect(await syncShippedFromShippo({ db, shippo, sendShipped, now: NOW }, ID), JSON.stringify(over)).toBe("skipped");
      expect(shippo).not.toHaveBeenCalled();
    }
  });
});
