import { describe, expect, it } from "vitest";
import { addressComplete, emptyAddress, quoteKey } from "./shippingCart";

const FULL = { name: "Dee Jones", street1: "215 Clayton St", street2: "", city: "San Francisco", state: "CA", zip: "94117", phone: "4155550100" };

describe("emptyAddress", () => {
  it("starts blank, with the profile phone when there is one", () => {
    expect(emptyAddress()).toEqual({ name: "", street1: "", street2: "", city: "", state: "", zip: "", phone: "" });
    expect(emptyAddress("7135550142").phone).toBe("7135550142");
  });
});

describe("addressComplete", () => {
  it("needs every field but the apartment, and a real ZIP", () => {
    expect(addressComplete(FULL)).toBe(true);
    expect(addressComplete({ ...FULL, zip: "94117-2214" })).toBe(true);
    expect(addressComplete({ ...FULL, zip: "7702" })).toBe(false);
    expect(addressComplete({ ...FULL, city: "  " })).toBe(false);
    expect(addressComplete({ ...FULL, phone: "" })).toBe(false);
  });
});

describe("quoteKey", () => {
  const items = [{ productId: "p1", quantity: 1 }];
  it("changes when the cart or the address changes, so an old price is cleared", () => {
    const k = quoteKey(items, FULL);
    expect(quoteKey(items, { ...FULL })).toBe(k);
    expect(quoteKey([{ productId: "p1", quantity: 2 }], FULL)).not.toBe(k);
    expect(quoteKey(items, { ...FULL, zip: "94118" })).not.toBe(k);
    expect(quoteKey(items, { ...FULL, name: "  Dee Jones " })).toBe(k);
  });
});
