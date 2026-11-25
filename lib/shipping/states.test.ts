import { describe, expect, it } from "vitest";
import { isShippableState, US_STATES } from "./states";

describe("US_STATES", () => {
  it("lists the 50 states and DC", () => {
    expect(US_STATES).toHaveLength(51);
    expect(US_STATES.find((s) => s.code === "DC")?.name).toBe("District of Columbia");
    expect(US_STATES.find((s) => s.code === "TX")?.name).toBe("Texas");
  });
});

describe("isShippableState", () => {
  it("ships to states, case-insensitive", () => {
    expect(isShippableState("tx", [])).toBe(true);
    expect(isShippableState("HI", [])).toBe(true);
  });
  it("refuses territories and military addresses", () => {
    for (const code of ["PR", "GU", "VI", "AS", "MP", "AA", "AE", "AP", "XX", ""]) {
      expect(isShippableState(code, []), code).toBe(false);
    }
  });
  it("refuses states the owner turned off", () => {
    expect(isShippableState("HI", ["HI", "AK"])).toBe(false);
    expect(isShippableState("ak", ["AK"])).toBe(false);
  });
});
