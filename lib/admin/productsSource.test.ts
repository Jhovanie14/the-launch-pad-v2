import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guards for admin › Products (Vitest has no DOM here).
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const RAW_PALETTE = /\b(?:bg|text|border|ring|fill|stroke)-(?:blue|gray|green|amber|red|slate)-\d/g;
const DRAWER = "components/admin/products/ProductDrawer.tsx";

describe("product drawer", () => {
  it("uses the shared form rules and keeps slugs stable", () => {
    const s = read(DRAWER);
    for (const fn of ["buildProductPayload(", "isDirty(", "formFromProduct(", "uniqueSlug("]) expect(s, fn).toContain(fn);
    expect(s).toContain('"23505"');
  });

  it("is in sections, with the short name and a category list", () => {
    const s = read(DRAWER);
    for (const copy of ["Basics", "Short name", "Price and stock", "Photos and video", "In the shop", "Featured at the top"]) {
      expect(s, copy).toContain(copy);
    }
    expect(s).toContain("<datalist");
  });

  it("asks before throwing away changes", () => {
    const s = read(DRAWER);
    expect(s).toContain("Discard your changes?");
    expect(s).toContain("AlertDialog");
  });

  it("keeps the upload behaviour", () => {
    const s = read(DRAWER);
    for (const fn of ["rejectImage(", "rejectVideo(", "uploadProductMedia(", "GALLERY_CONCURRENCY"]) expect(s, fn).toContain(fn);
  });

  it("tokens only", () => {
    expect(read(DRAWER).match(RAW_PALETTE) ?? []).toEqual([]);
  });
});

export { existsSync, readdirSync };
