import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardMeta, parseDescription, productTitle } from "./describe";

// The live utility-towel description, as an owner typed it.
const UTILITY = [
  "🧼 Utility Towel Bundle",
  "",
  "✨ Perfect for Cleaning and Daily Use ✨",
  "",
  "Size: 15.75 × 15.75 inches",
  "",
  "Weight: 300GSM",
  "",
  "Quantity: Bundle of 8",
  "",
  "Affordable and Practical",
].join("\n");

describe("productTitle", () => {
  it("prefers the display name, trimmed", () => {
    expect(productTitle({ name: "Long marketplace title", display_name: "  Utility towels, 8-pack " })).toBe("Utility towels, 8-pack");
  });
  it("falls back to the full name when the display name is empty", () => {
    expect(productTitle({ name: "Wheel brush", display_name: null })).toBe("Wheel brush");
    expect(productTitle({ name: "Wheel brush", display_name: "   " })).toBe("Wheel brush");
    expect(productTitle({ name: "Wheel brush" })).toBe("Wheel brush");
  });
});

describe("parseDescription", () => {
  it("splits labelled lines into specs and the rest into paragraphs, without emoji", () => {
    expect(parseDescription(UTILITY)).toEqual({
      about: ["Utility Towel Bundle", "Perfect for Cleaning and Daily Use", "Affordable and Practical"],
      specs: [
        { label: "Size", value: "15.75 × 15.75 inches" },
        { label: "Weight", value: "300GSM" },
        { label: "Quantity", value: "Bundle of 8" },
      ],
    });
  });

  it("keeps a long labelled sentence as a paragraph, not a spec", () => {
    const text = "Dimensions & Weight: This microfiber towel measures 15.75 × 15.75 inches and weighs 1200 gsm, perfect for every job.";
    expect(parseDescription(text)).toEqual({ about: [text], specs: [] });
  });

  it("drops lines that were only emoji", () => {
    expect(parseDescription("🚗\n\n✨✨\nSoft and absorbent.")).toEqual({ about: ["Soft and absorbent."], specs: [] });
  });

  it("handles no description", () => {
    expect(parseDescription(null)).toEqual({ about: [], specs: [] });
    expect(parseDescription("")).toEqual({ about: [], specs: [] });
  });
});

describe("emoji are left out, brand marks kept", () => {
  it("drops skin-tone modifiers and flags", () => {
    expect(parseDescription("👍🏽 Great shine\n🇺🇸 Made in USA").about).toEqual(["Great shine", "Made in USA"]);
  });
  it("keeps ©, ® and ™", () => {
    expect(parseDescription("Gold Class® Wax™ ©2024").about).toEqual(["Gold Class® Wax™ ©2024"]);
  });
});

describe("cardMeta", () => {
  it("is the weight and size, when the description has them", () => {
    expect(cardMeta(UTILITY)).toBe("300GSM · 15.75 × 15.75 inches");
  });
  it("is null otherwise", () => {
    expect(cardMeta("Soft and absorbent.")).toBeNull();
    expect(cardMeta(null)).toBeNull();
  });
});

describe("display name migration", () => {
  it("adds a short, optional display name", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261124010000_product_display_name.sql"), "utf8").toLowerCase();
    expect(sql).toContain("add column if not exists display_name text");
    expect(sql).toMatch(/char_length\(display_name\)\s*<=\s*60/);
  });
});
