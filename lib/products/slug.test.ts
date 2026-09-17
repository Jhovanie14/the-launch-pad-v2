import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates a product name", () => {
    expect(slugify("Ultra Plush Premium Microfiber")).toBe(
      "ultra-plush-premium-microfiber",
    );
  });

  it("collapses punctuation and runs of separators into one hyphen", () => {
    expect(slugify("Tire Shine -- 500ml!")).toBe("tire-shine-500ml");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  ...Carnauba Wax...  ")).toBe("carnauba-wax");
  });

  it("keeps digits", () => {
    expect(slugify("Microfiber 1200 GSM")).toBe("microfiber-1200-gsm");
  });

  it("folds accented characters to their ascii base", () => {
    expect(slugify("Café Edition")).toBe("cafe-edition");
  });

  it("falls back when the name has no usable characters", () => {
    expect(slugify("!!!")).toBe("product");
    expect(slugify("")).toBe("product");
  });

  it("accepts a custom fallback", () => {
    expect(slugify("???", "item")).toBe("item");
  });
});

describe("uniqueSlug", () => {
  it("returns the plain slug when nothing has claimed it", () => {
    expect(uniqueSlug("Carnauba Wax", [])).toBe("carnauba-wax");
  });

  it("suffixes the next free number on collision", () => {
    expect(uniqueSlug("Carnauba Wax", ["carnauba-wax"])).toBe("carnauba-wax-2");
  });

  it("keeps counting past several collisions", () => {
    const taken = ["carnauba-wax", "carnauba-wax-2", "carnauba-wax-3"];
    expect(uniqueSlug("Carnauba Wax", taken)).toBe("carnauba-wax-4");
  });

  it("ignores gaps and takes the first free suffix", () => {
    const taken = ["carnauba-wax", "carnauba-wax-3"];
    expect(uniqueSlug("Carnauba Wax", taken)).toBe("carnauba-wax-2");
  });

  it("accepts a Set of taken slugs", () => {
    expect(uniqueSlug("Carnauba Wax", new Set(["carnauba-wax"]))).toBe(
      "carnauba-wax-2",
    );
  });

  it("dedupes the fallback too", () => {
    expect(uniqueSlug("!!!", ["product"])).toBe("product-2");
  });
});
