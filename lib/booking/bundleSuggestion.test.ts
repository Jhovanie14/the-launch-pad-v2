import { describe, expect, it } from "vitest";
import { applySale } from "./pricingDisplay";
import { bundleSuggestion } from "./bundleSuggestion";

const cents = (n: number) => Math.round(n * 100) / 100;

const classic = { id: "classic", name: "Classic Complete", price: 45, features: ["Quick Exterior Wash"] };
const quick = { id: "quick", name: "Quick Exterior Wash", price: 25, features: ["Hand wash"] };
const complete = {
  id: "complete",
  name: "Express Complete Detail",
  price: 65,
  features: ["Express Exterior", "Express Interior"],
};
const catalog = [quick, classic, complete];

describe("bundleSuggestion", () => {
  it("Classic Complete + $30 of extras → suggests Express Complete, totals with the sale", () => {
    const s = bundleSuggestion({
      chosen: classic,
      addOns: [{ price: 20 }, { price: 10 }],
      catalog,
      isServiceFree: false,
    });
    expect(s?.pkg).toEqual({ id: "complete", name: "Express Complete Detail", features: ["Express Exterior", "Express Interior"] });
    expect(s?.currentTotal).toBe(cents(applySale(75)));
    expect(s?.packageTotal).toBe(cents(applySale(65)));
  });

  it("total below the package → null", () => {
    expect(bundleSuggestion({ chosen: quick, addOns: [{ price: 10 }], catalog, isServiceFree: false })).toBeNull();
  });

  it("total equal to the package → null", () => {
    expect(bundleSuggestion({ chosen: classic, addOns: [{ price: 20 }], catalog, isServiceFree: false })).toBeNull();
  });

  it("already chose Express Complete → null", () => {
    expect(
      bundleSuggestion({ chosen: complete, addOns: [{ price: 50 }, { price: 50 }], catalog, isServiceFree: false })
    ).toBeNull();
  });

  it("member's covered service → null", () => {
    expect(
      bundleSuggestion({ chosen: classic, addOns: [{ price: 50 }, { price: 50 }], catalog, isServiceFree: true })
    ).toBeNull();
  });

  it("no Express Complete in the catalog → null", () => {
    expect(
      bundleSuggestion({ chosen: classic, addOns: [{ price: 50 }], catalog: [quick, classic], isServiceFree: false })
    ).toBeNull();
  });

  it("features null → []", () => {
    const s = bundleSuggestion({
      chosen: classic,
      addOns: [{ price: 50 }],
      catalog: [classic, { ...complete, features: null }],
      isServiceFree: false,
    });
    expect(s?.pkg.features).toEqual([]);
  });
});
