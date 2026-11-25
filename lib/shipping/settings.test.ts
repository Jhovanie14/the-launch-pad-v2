import { describe, expect, it } from "vitest";
import { DEFAULT_POUCH } from "./parcel";
import { getShippingSettings, sanitizeShippingSettings } from "./settings";

const pouch = { name: "Standard pouch", length_in: 13, width_in: 10, height_in: 1, max_weight_oz: 160 };

describe("sanitizeShippingSettings", () => {
  it("keeps valid pouches and upper-cases states", () => {
    expect(sanitizeShippingSettings({ pouches: [pouch], excluded_states: ["hi", " ak "] })).toEqual({
      pouches: [pouch],
      excludedStates: ["HI", "AK"],
    });
  });
  it("needs 1 to 5 pouches", () => {
    expect(() => sanitizeShippingSettings({ pouches: [], excluded_states: [] })).toThrow("Add at least one pouch");
    expect(() => sanitizeShippingSettings({ pouches: Array(6).fill(pouch), excluded_states: [] })).toThrow("Up to 5 pouches");
  });
  it("refuses sizes that aren't positive numbers up to 999", () => {
    for (const bad of [{ length_in: -1 }, { width_in: 0 }, { max_weight_oz: 1000 }, { height_in: "2" }, { name: "" }]) {
      expect(() => sanitizeShippingSettings({ pouches: [{ ...pouch, ...bad }], excluded_states: [] }), JSON.stringify(bad)).toThrow();
    }
  });
  it("refuses unknown state codes", () => {
    expect(() => sanitizeShippingSettings({ pouches: [pouch], excluded_states: ["XX"] })).toThrow("Unknown state: XX");
  });
});

describe("getShippingSettings", () => {
  const selected: string[] = [];
  const db = (row: unknown) =>
    ({
      from: () => ({
        select: (c: string) => (selected.push(c), { eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      }),
    }) as never;

  it("falls back to the default pouch and no exclusions", async () => {
    expect(await getShippingSettings(db({}))).toEqual({ pouches: [DEFAULT_POUCH], excludedStates: [] });
    expect(await getShippingSettings(db(null))).toEqual({ pouches: [DEFAULT_POUCH], excludedStates: [] });
    expect(selected.at(-1)).toBe("*");
  });
  it("reads saved pouches and exclusions", async () => {
    expect(await getShippingSettings(db({ shipping_pouches: [pouch], shipping_excluded_states: ["HI"] }))).toEqual({
      pouches: [pouch],
      excludedStates: ["HI"],
    });
  });
  it("ignores a malformed saved pouch list", async () => {
    expect(await getShippingSettings(db({ shipping_pouches: "nope" }))).toEqual({ pouches: [DEFAULT_POUCH], excludedStates: [] });
  });
});
