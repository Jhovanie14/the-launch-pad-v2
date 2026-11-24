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
      "Search reference, name or phone",
    ]) {
      expect(s, copy).toContain(copy);
    }
  });

  it("names payment methods from the shared labels", () => {
    expect(read()).toContain("PAID_VIA_LABEL[m]");
    expect(read()).toContain('["cash", "card_reader", "counter_qr"]');
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
