import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fakeDb } from "./__fixtures__/fakeDb";
import { handleShippoEvent } from "./webhook";

const ID = "b81e0d44-0000-4000-8000-000000000000";
const NOW = new Date("2026-11-27T18:00:00Z");
const ADDRESS = { name: "Dee Jones", street1: "215 CLAYTON ST", city: "San Francisco", state: "CA", zip: "94117", phone: "4155550100" };

function setup(order: Record<string, unknown> = {}, remote: Record<string, unknown> = {}) {
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
        tracking_number: null,
        ...order,
      },
    ],
    profiles: [{ id: "u1", email: "dee@example.com", full_name: "Dee" }],
  });
  const shippo = vi.fn(async (_m: string, path: string) => {
    if (path in remote) return remote[path];
    throw new Error("unexpected " + path);
  });
  const emails = { shipped: vi.fn(async () => {}), delivered: vi.fn(async () => {}) };
  return { db, tables, shippo, emails, deps: { db, shippo, emails, now: NOW } };
}

const TX = (over: Record<string, unknown> = {}) => ({
  object_id: "tx_1",
  status: "SUCCESS",
  order: "so_1",
  tracking_number: "9400111899",
  tracking_url_provider: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899",
  label_url: "https://shippo.test/label.pdf",
  ...over,
});

describe("handleShippoEvent: labels", () => {
  it("re-fetches the transaction and ships the matching order, emailing once", async () => {
    const { deps, tables, emails } = setup({}, { "/transactions/tx_1": TX() });
    // The posted body is only a hint: its status and tracking are ignored.
    const event = { event: "transaction_created", data: { object_id: "tx_1", status: "SUCCESS", tracking_number: "FORGED" } };
    expect(await handleShippoEvent(deps, event)).toBe("shipped");
    expect(tables.product_orders[0]).toMatchObject({ fulfilment_status: "out_for_delivery", tracking_number: "9400111899" });
    expect(emails.shipped).toHaveBeenCalledTimes(1);

    expect(await handleShippoEvent(deps, event)).toBe("skipped");
    expect(emails.shipped).toHaveBeenCalledTimes(1);
  });

  it("changes nothing for a label that isn't one of our orders", async () => {
    const { deps, tables, emails } = setup({}, { "/transactions/tx_1": TX({ order: "so_other" }) });
    expect(await handleShippoEvent(deps, { event: "transaction_created", data: { object_id: "tx_1" } })).toBe("ignored");
    expect(tables.product_orders[0].fulfilment_status).toBe("placed");
    expect(emails.shipped).not.toHaveBeenCalled();
  });

  it("puts a shipped order back to packing when its label is voided", async () => {
    const { deps, tables } = setup(
      { fulfilment_status: "out_for_delivery", tracking_number: "9400111899", tracking_url: "x", label_url: "y", shipped_at: "z" },
      { "/transactions/tx_1": TX({ status: "REFUNDED" }) },
    );
    expect(await handleShippoEvent(deps, { event: "transaction_updated", data: { object_id: "tx_1" } })).toBe("label voided");
    expect(tables.product_orders[0]).toMatchObject({
      fulfilment_status: "placed",
      tracking_number: null,
      tracking_url: null,
      label_url: null,
      shipped_at: null,
    });
  });

  it("ignores an event without an id", async () => {
    const { deps, shippo } = setup();
    expect(await handleShippoEvent(deps, { event: "transaction_created", data: {} })).toBe("ignored");
    expect(shippo).not.toHaveBeenCalled();
  });
});

describe("handleShippoEvent: tracking", () => {
  const shippedOrder = { fulfilment_status: "out_for_delivery", tracking_number: "9400111899" };
  const track = (status: string, details = "") => ({
    "/tracks/usps/9400111899": { tracking_number: "9400111899", tracking_status: { status, status_details: details } },
  });

  it("completes the order when USPS says delivered, emailing once", async () => {
    const { deps, tables, emails } = setup(shippedOrder, track("DELIVERED"));
    const event = { event: "track_updated", data: { tracking_number: "9400111899", tracking_status: { status: "DELIVERED" } } };
    expect(await handleShippoEvent(deps, event)).toBe("delivered");
    expect(tables.product_orders[0]).toMatchObject({
      fulfilment_status: "completed",
      delivered_at: NOW.toISOString(),
      completed_at: NOW.toISOString(),
    });
    expect(emails.delivered).toHaveBeenCalledWith({ to: "dee@example.com", name: "Dee", orderId: ID });
    expect(await handleShippoEvent(deps, event)).toBe("skipped");
    expect(emails.delivered).toHaveBeenCalledTimes(1);
  });

  it("flags a returned or failed parcel for staff", async () => {
    const { deps, tables } = setup(shippedOrder, track("RETURNED", "Returned to sender"));
    expect(await handleShippoEvent(deps, { event: "track_updated", data: { tracking_number: "9400111899" } })).toBe("problem");
    expect(tables.product_orders[0].shipping_problem).toBe("RETURNED: Returned to sender");
    expect(tables.product_orders[0].fulfilment_status).toBe("out_for_delivery");
  });

  it("trusts the re-fetched status, not the posted one", async () => {
    const { deps, tables, emails } = setup(shippedOrder, track("TRANSIT"));
    const event = { event: "track_updated", data: { tracking_number: "9400111899", tracking_status: { status: "DELIVERED" } } };
    expect(await handleShippoEvent(deps, event)).toBe("in transit");
    expect(tables.product_orders[0].fulfilment_status).toBe("out_for_delivery");
    expect(emails.delivered).not.toHaveBeenCalled();
  });

  it("ignores tracking for numbers we don't know", async () => {
    const { deps, shippo } = setup();
    expect(await handleShippoEvent(deps, { event: "track_updated", data: { tracking_number: "UNKNOWN" } })).toBe("ignored");
    expect(shippo).not.toHaveBeenCalled();
  });
});

describe("Shippo webhook route", () => {
  it("checks a secret token in constant time and re-fetches through the handler", () => {
    const s = readFileSync(join(process.cwd(), "app/api/webhooks/shippo/route.ts"), "utf8");
    expect(s).toContain("SHIPPO_WEBHOOK_SECRET");
    expect(s).toContain("timingSafeEqual");
    expect(s).toContain("handleShippoEvent(");
    expect(s).toContain("status: 401");
  });
});
