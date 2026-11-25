import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = () => readFileSync(join(process.cwd(), "app/admin/orders/orders-view.tsx"), "utf8");
const RAW_PALETTE = /\b(?:bg|text|border|ring|fill|stroke)-(?:blue|gray|green|amber|red|slate)-\d/g;

describe("admin store orders counter screen", () => {
  it("uses the shared order rules and search", () => {
    const s = read();
    for (const fn of ["staffActionsFor(", "staffQueue(", "matchesOrderSearch(", "customerStatus("]) expect(s, fn).toContain(fn);
  });

  it("has the counter's tabs and copy", () => {
    const s = read();
    for (const copy of [
      "To pack",
      "Ready",
      "Unpaid",
      "Completed",
      "Closed",
      "How did they pay",
      "Release reservation",
      "Pickup hours",
      "Hold unpaid orders for",
      "Pickup instructions",
      "Optional. Shown under the pickup hours.",
      "Search reference, name or phone",
    ]) {
      expect(s, copy).toContain(copy);
    }
  });

  it("names payment methods from the shared labels", () => {
    expect(read()).toContain("PAID_VIA_LABEL[m]");
    expect(read()).toContain('["cash", "card_reader", "zelle", "counter_qr"]');
  });

  it("fits four payment methods: two by two on phones, four across from sm", () => {
    expect(read()).toMatch(/grid grid-cols-2 gap-2 sm:grid-cols-4/);
  });

  it("loads and saves the pickup note with the other settings", () => {
    const s = read();
    expect(s).toContain("s.pickupNote");
    expect(s).toContain("pickup_note: note");
    expect(s).toContain("maxLength={200}");
  });

  it("has a Shipped queue and hands shipping orders to the shipping actions", () => {
    const s = read();
    expect(s).toContain('{ key: "shipped", label: "Shipped" }');
    expect(s).toContain("<ShippingActions");
    expect(s).toContain("<ShippingSettingsPanel");
    expect(s).toContain("isShippingOrder(");
    expect(s).toContain("Void the label in Shippo too.");
    expect(s).toContain("Not in Shippo yet");
    expect(s).toContain("Ship to:");
  });

  it("posts to the new routes only", () => {
    const s = read();
    expect(s).toContain("/api/admin/product-orders/action");
    expect(s).toContain("/api/admin/store-settings/pickup");
    expect(s).not.toContain("update-status");
  });

  it("tokens only, and no delivery filter while delivery is paused", () => {
    const s = read();
    expect(s.match(RAW_PALETTE) ?? []).toEqual([]);
    expect(s).not.toContain('"Out for delivery"');
  });
});

describe("shipping actions on the counter screen", () => {
  const actions = () => readFileSync(join(process.cwd(), "components/admin/orders/ShippingActions.tsx"), "utf8");
  const settings = () => readFileSync(join(process.cwd(), "components/admin/orders/ShippingSettingsPanel.tsx"), "utf8");

  it("offers Shippo and the manual fallbacks with the agreed copy", () => {
    const s = actions();
    for (const copy of ["Open in Shippo to buy label", "Send to Shippo", "Check Shippo", "Mark shipped", "Mark delivered", "Tracking number"]) {
      expect(s, copy).toContain(copy);
    }
    expect(s).toContain('href="https://apps.goshippo.com/orders"');
    expect(s).toContain('rel="noreferrer"');
    expect(read()).toContain("/api/admin/product-orders/shippo");
    expect(s.match(RAW_PALETTE) ?? []).toEqual([]);
  });

  it("edits pouches and the states we don't ship to", () => {
    const s = settings();
    for (const copy of ["Shipping settings", "Pouches", "Don&apos;t ship to"]) expect(s, copy).toContain(copy);
    expect(s).toContain("/api/admin/store-settings/shipping");
    expect(s).toContain("getShippingSettings(");
    expect(s.match(RAW_PALETTE) ?? []).toEqual([]);
  });

  it("the settings route is admin-only and sanitised", () => {
    const s = readFileSync(join(process.cwd(), "app/api/admin/store-settings/shipping/route.ts"), "utf8");
    expect(s).toContain("requireAdmin(");
    expect(s).toContain("sanitizeShippingSettings(");
    expect(s).toContain("shipping_excluded_states");
  });

  it("the action route accepts the shipping actions and a tracking number", () => {
    const s = readFileSync(join(process.cwd(), "app/api/admin/product-orders/action/route.ts"), "utf8");
    expect(s).toContain('"mark_shipped"');
    expect(s).toContain('"mark_delivered"');
    expect(s).toContain("trackingNumber: tracking_number");
    expect(s).toContain("sendProductOrderShippedEmail");
    expect(s).toContain("sendProductOrderDeliveredEmail");
  });
});
