import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guards for the catalog redesign (Vitest has no DOM here).
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const RAW_PALETTE = /\b(?:bg|text|border|ring|fill|stroke)-(?:blue|gray|green|amber|red|slate)-\d/g;
const OLD_WORLD = /\b(?:font-display|text-gold|bg-gold|border-gold|gold-soft|rounded-none)\b/g;

describe("storefront hero", () => {
  const hero = () => read("components/products/storefront-hero.tsx");

  it("is on the brand tokens, with no eyebrow", () => {
    const s = hero();
    expect(s.match(OLD_WORLD) ?? []).toEqual([]);
    expect(s).not.toContain("uppercase");
    expect(s).not.toContain("Pro Series</p>");
    expect(s).not.toContain("The Launch Pad · Pro Series");
  });

  it("keeps the film and scrolls smoothly, unless motion is reduced", () => {
    const s = hero();
    expect(s).toContain("ProductVideo");
    expect(s).toContain("scrollIntoView");
    expect(s).toContain("prefers-reduced-motion");
  });
});

describe("product list page", () => {
  it("is on Canvas, not the storefront", () => {
    const s = read("app/(user)/products/page.tsx");
    expect(s).not.toContain("STOREFRONT_CLASS");
    expect(s).toContain("bg-canvas");
    expect(s).toContain("No products right now");
    expect(s.match(RAW_PALETTE) ?? []).toEqual([]);
  });
});

describe("product cards and buttons", () => {
  const FILES = [
    "components/products/product-card.tsx",
    "components/products/product-actions.tsx",
    "components/products/product-catalog.tsx",
    "components/products/featured-product.tsx",
  ];

  it("cards show the short title, the spec line and the whole packshot", () => {
    const s = read("components/products/product-card.tsx");
    expect(s).toContain("productTitle(");
    expect(s).toContain("cardMeta(");
    expect(s).toContain("object-contain");
    expect(s).toContain("line-clamp-2");
    expect(s).not.toContain("motion/react");
  });

  it("add to cart is named, 44px, and disabled when sold out", () => {
    const s = read("components/products/product-actions.tsx");
    expect(s).toMatch(/aria-label=\{`Add \$\{[^}]+\} to cart`\}/);
    expect(s).toContain("Sold out");
    expect(s).toMatch(/\b(?:h-11|size-11)\b/);
  });

  it("all on the brand tokens", () => {
    for (const f of FILES) {
      const s = read(f);
      expect(s.match(OLD_WORLD) ?? [], f).toEqual([]);
      expect(s.match(RAW_PALETTE) ?? [], f).toEqual([]);
    }
  });
});

describe("product page", () => {
  const page = () => read("app/(user)/products/[slug]/page.tsx");
  const buy = () => read("components/products/BuyBox.tsx");

  it("leads with the short title, price and add to cart, then the details", () => {
    const s = page();
    for (const bit of ["productTitle(", "parseDescription(", "<BuyBox", "pickup_hours", "About this product", "Specs", "More products"]) {
      expect(s, bit).toContain(bit);
    }
    expect(s).not.toContain("STOREFRONT_CLASS");
    expect(s).not.toContain("whitespace-pre-line");
  });

  it("keeps add to cart in reach on phones, and says when it's sold out", () => {
    const s = buy();
    expect(s).toMatch(/sticky bottom-0[^"]*lg:hidden|lg:hidden[^"]*sticky bottom-0/);
    expect(s).toContain("FLAME_BUTTON");
    expect(s).toContain("Sold out");
    expect(s).toContain("size-11");
  });

  it("all on the brand tokens", () => {
    for (const f of ["app/(user)/products/[slug]/page.tsx", "components/products/BuyBox.tsx", "components/products/product-gallery.tsx"]) {
      const s = read(f);
      expect(s.match(OLD_WORLD) ?? [], f).toEqual([]);
      expect(s.match(RAW_PALETTE) ?? [], f).toEqual([]);
    }
  });
});
