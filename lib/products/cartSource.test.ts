import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guards for the cart and the storefront split (no DOM here).
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const CART = "app/(user)/products/cart/page.tsx";
const RAW_PALETTE = /\b(?:bg|text|border|ring|fill|stroke)-(?:blue|gray|green|amber|red|slate)-\d/g;

describe("cart", () => {
  it("asks how to pay, with real radio inputs", () => {
    const s = read(CART);
    for (const copy of ["How do you want to pay?", "Pay now by card", "Pay at the store", "Reserve for pickup"]) {
      expect(s, copy).toContain(copy);
    }
    expect(s).toContain('type="radio"');
    expect(s).toContain("payment_method");
  });

  it("explains the hold with the owner's setting", () => {
    expect(read(CART)).toContain("holdDays");
    expect(read(CART)).toMatch(/pickupHours\s*&&/);
    expect(read(CART)).toMatch(/pickupNote\s*&&/);
    expect(read(CART)).toContain("setPickupNote(settings.pickupNote)");
  });

  it("names the counter methods the owner takes", () => {
    expect(read(CART)).toContain("Cash, card or Zelle when you collect");
  });

  it("shows checkout errors next to the button, not only as a toast", () => {
    expect(read(CART)).toContain('role="alert"');
  });

  it("44px quantity buttons", () => {
    expect(read(CART)).toContain("size-11");
    expect(read(CART)).not.toContain('size="sm"');
  });

  it("tokens only, and no shadcn storefront leftovers", () => {
    const s = read(CART);
    expect(s.match(RAW_PALETTE) ?? []).toEqual([]);
    expect(s).not.toContain("text-gold");
    expect(s).not.toContain("Collection");
  });
});
