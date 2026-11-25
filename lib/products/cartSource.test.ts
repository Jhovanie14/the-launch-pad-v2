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

describe("cart: ship to me", () => {
  const FORM = "components/products/ShippingAddressForm.tsx";

  it("asks how to get it, pickup first", () => {
    const s = read(CART);
    expect(s).toContain("How do you want to get it?");
    expect(s).toContain("Pick up at the carwash · Free");
    expect(s).toContain("Ship to me · USPS");
    expect(s).toContain("Price based on your address and the weight.");
    expect(s.indexOf("Pick up at the carwash")).toBeLessThan(s.indexOf("Ship to me"));
    expect(s).toContain('name="fulfilment"');
  });

  it("only offers shipping when the store has it switched on", () => {
    const s = read(CART);
    expect(s).toContain('fetch("/api/products/shipping-quote")');
    expect(s).toMatch(/shipAvailable\s*&&/);
  });

  it("prices shipping on request and sends the shown price to be checked", () => {
    const s = read(CART);
    expect(s).toContain("Get shipping price");
    expect(s).toContain("expected_shipping");
    expect(s).toContain('fulfillment_method: method');
    expect(s).toContain("quoteKey(");
    expect(s).toContain("We couldn't confirm this address");
    expect(s).toContain("Shipping (USPS Ground Advantage)");
  });

  it("prices carry the dollar sign", () => {
    expect(read(CART)).toContain("const money = (n: number) => `$${n.toFixed(2)}`;");
  });

  it("shipping orders are card only", () => {
    const s = read(CART);
    expect(s).toContain("Only for pickup orders.");
    expect(s).toContain("Pay ${money(total)} by card");
  });

  it("collects a full US address with autofill hints", () => {
    const s = read(FORM);
    for (const hint of ["name", "address-line1", "address-line2", "address-level2", "address-level1", "postal-code", "tel"]) {
      expect(s, hint).toContain(`autoComplete="${hint}"`);
    }
    expect(s).toContain("US_STATES");
    expect(s).toContain("excludedStates");
    expect(s.match(RAW_PALETTE) ?? []).toEqual([]);
  });
});
