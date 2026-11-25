import { describe, expect, it } from "vitest";
import { buildParcel, DEFAULT_POUCH, type Pouch } from "./parcel";

const SMALL: Pouch = { name: "Small", length_in: 9, width_in: 6, height_in: 1, max_weight_oz: 32 };

describe("buildParcel", () => {
  it("adds up the weights and packs into the default pouch", () => {
    const r = buildParcel(
      [
        { name: "Microfiber towel", weight_oz: 8, quantity: 1 },
        { name: "Drying towel", weight_oz: 16, quantity: 2 },
      ],
      [DEFAULT_POUCH],
    );
    expect(r).toEqual({
      ok: true,
      weightOz: 40,
      parcel: { length: "13", width: "10", height: "1", distance_unit: "in", weight: "40", mass_unit: "oz" },
    });
  });

  it("rounds the weight up to a tenth of an ounce", () => {
    const r = buildParcel([{ name: "A", weight_oz: 2.33, quantity: 3 }], [DEFAULT_POUCH]);
    expect(r.ok && r.weightOz).toBe(7);
    const r2 = buildParcel([{ name: "A", weight_oz: 2.31, quantity: 1 }], [DEFAULT_POUCH]);
    expect(r2.ok && r2.weightOz).toBe(2.4);
  });

  it("refuses a product without a weight, by name", () => {
    expect(buildParcel([{ name: "Utility towels", weight_oz: null, quantity: 1 }], [DEFAULT_POUCH])).toEqual({
      ok: false,
      error: "Shipping isn't available for Utility towels yet. Choose pickup.",
    });
  });

  it("refuses an order heavier than every pouch", () => {
    expect(buildParcel([{ name: "A", weight_oz: 161, quantity: 1 }], [DEFAULT_POUCH])).toEqual({
      ok: false,
      error: "This order is too big to ship online. Choose pickup or contact us.",
    });
  });

  it("picks the smallest pouch that holds the weight", () => {
    const r = buildParcel([{ name: "A", weight_oz: 30, quantity: 1 }], [DEFAULT_POUCH, SMALL]);
    expect(r.ok && r.parcel.length).toBe("9");
    const big = buildParcel([{ name: "A", weight_oz: 33, quantity: 1 }], [DEFAULT_POUCH, SMALL]);
    expect(big.ok && big.parcel.length).toBe("13");
  });

  it("falls back to the default pouch when none are set", () => {
    expect(buildParcel([{ name: "A", weight_oz: 4, quantity: 1 }], []).ok).toBe(true);
  });
});
