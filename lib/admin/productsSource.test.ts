import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guards for admin › Products (Vitest has no DOM here).
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const RAW_PALETTE = /\b(?:bg|text|border|ring|fill|stroke)-(?:blue|gray|green|amber|red|slate)-\d/g;
const DRAWER = "components/admin/products/ProductDrawer.tsx";

describe("product drawer", () => {
  it("has a Shipping section with the packed weight", () => {
    const s = read(DRAWER);
    expect(s).toContain('<Section title="Shipping">');
    expect(s).toContain("Shipping weight (oz)");
    expect(s).toContain("Weight packed in its pouch");
    expect(s).toContain('set("weight_oz"');
  });

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


const LIST = "components/admin/products/ProductsList.tsx";
const VIEW = "app/admin/products/products-view.tsx";

describe("products list", () => {
  it("uses the shared list rules and a guarded stock write", () => {
    const s = read(LIST);
    for (const fn of ["chipCounts(", "matchesChip(", "matchesProductSearch(", "parseStockInput(", "receivePatch(", "needsList(", 'eq("stock"']) {
      expect(s, fn).toContain(fn);
    }
  });

  it("receives stock, sets an exact count, and deletes only after asking", () => {
    const s = read(LIST);
    for (const copy of ["Receive", "Set exact count", "permanently", "Stock just changed"]) expect(s, copy).toContain(copy);
    expect(s).toContain("AlertDialog");
    expect(s).not.toContain("window.confirm");
  });

  it("the shown switch and row buttons are labelled", () => {
    const s = read(LIST);
    expect(s).toMatch(/aria-label=\{\x60Show \$\{[^}]+\} in the shop\x60\}/);
    expect(s).toContain(">Edit<");
  });
});

describe("products page", () => {
  it("has a Storefront tab that still edits the hero", () => {
    const s = read(VIEW);
    expect(s).toContain("<Tabs");
    expect(s).toContain("Storefront");
    expect(s).toContain("<StorefrontHeroSettings");
    expect(s).toContain("<ProductsList");
    expect(s).toContain("<ProductDrawer");
  });

  it("the old stat tiles are gone", () => {
    expect(existsSync(join(process.cwd(), "components/admin/product-stats.tsx"))).toBe(false);
    expect(read(VIEW)).not.toContain("ProductStats");
  });

  it("tokens only across the page", () => {
    const files = [VIEW, "app/admin/products/page.tsx", ...readdirSync(join(process.cwd(), "components/admin/products")).map((f) => "components/admin/products/" + f)];
    for (const f of files) expect(read(f).match(RAW_PALETTE) ?? [], f).toEqual([]);
  });
});

describe("review fixes", () => {
  it("the drawer's save guards stock like Receive does", () => {
    const s = read(DRAWER);
    expect(s).toContain("stockWrite(");
    expect(s).toContain("Stock just changed");
  });
  it("the table layout waits for wide screens, so the name always has room", () => {
    const s = read(LIST);
    expect(s).toContain("xl:grid-cols-[");
    expect(s).not.toMatch(/\bmd:grid-cols-\[3rem/);
  });
  it("the receive popover starts fresh each time it opens", () => {
    expect(read(LIST)).toMatch(/if \(!o\) \{[^}]*setMode\("add"\)[^}]*setRaw\(""\)/);
  });
});
