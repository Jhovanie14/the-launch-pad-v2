import { describe, expect, it } from "vitest";
import {
  FILTER_THRESHOLD,
  categoriesOf,
  filterProducts,
  priceCeiling,
  shouldShowFilters,
  splitCatalog,
} from "./catalog";

type P = Parameters<typeof splitCatalog>[0][number];

const make = (over: Partial<P> & { id: string }): P => ({
  name: "Product",
  category: "Exterior",
  price: 20,
  sale_price: null,
  is_featured: false,
  sort_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("splitCatalog", () => {
  it("separates featured products from the rest", () => {
    const a = make({ id: "a", is_featured: true });
    const b = make({ id: "b" });
    const { featured, rest } = splitCatalog([a, b]);
    expect(featured.map((p) => p.id)).toEqual(["a"]);
    expect(rest.map((p) => p.id)).toEqual(["b"]);
  });

  it("orders each group by sort_order, then newest first", () => {
    const first = make({ id: "first", sort_order: 1 });
    const second = make({ id: "second", sort_order: 2 });
    const older = make({ id: "older", sort_order: 1, created_at: "2025-01-01T00:00:00Z" });
    const { rest } = splitCatalog([second, older, first]);
    expect(rest.map((p) => p.id)).toEqual(["first", "older", "second"]);
  });

  it("returns empty groups for an empty catalog", () => {
    expect(splitCatalog([])).toEqual({ featured: [], rest: [] });
  });
});

describe("categoriesOf", () => {
  it("lists unique categories with 'all' first", () => {
    const products = [
      make({ id: "a", category: "Interior" }),
      make({ id: "b", category: "Exterior" }),
      make({ id: "c", category: "Interior" }),
    ];
    expect(categoriesOf(products)).toEqual(["all", "Exterior", "Interior"]);
  });

  it("is just 'all' when there are no products", () => {
    expect(categoriesOf([])).toEqual(["all"]);
  });
});

describe("priceCeiling", () => {
  it("rounds up to the highest selling price", () => {
    const products = [make({ id: "a", price: 12.2 }), make({ id: "b", price: 48.6 })];
    expect(priceCeiling(products)).toBe(49);
  });

  it("uses the sale price when one is set", () => {
    const products = [make({ id: "a", price: 90, sale_price: 30.4 })];
    expect(priceCeiling(products)).toBe(31);
  });

  it("never returns zero, so the slider always has a range", () => {
    expect(priceCeiling([])).toBeGreaterThan(0);
  });
});

describe("shouldShowFilters", () => {
  it("hides filters for a small catalog", () => {
    expect(shouldShowFilters(FILTER_THRESHOLD - 1)).toBe(false);
  });

  it("shows them once the catalog reaches the threshold", () => {
    expect(shouldShowFilters(FILTER_THRESHOLD)).toBe(true);
  });
});

describe("filterProducts", () => {
  const products = [
    make({ id: "wax", name: "Carnauba Wax", category: "Exterior", price: 40, sort_order: 2 }),
    make({ id: "tire", name: "Tire Shine", category: "Exterior", price: 12, sort_order: 1 }),
    make({
      id: "towel",
      name: "Microfiber Towel",
      category: "Interior",
      price: 25,
      created_at: "2026-06-01T00:00:00Z",
    }),
  ];

  const base = {
    category: "all",
    search: "",
    priceRange: [0, 1000] as [number, number],
    sortBy: "curated" as const,
  };

  it("returns everything by default, in curated order", () => {
    expect(filterProducts(products, base).map((p) => p.id)).toEqual([
      "towel",
      "tire",
      "wax",
    ]);
  });

  it("filters by category", () => {
    const out = filterProducts(products, { ...base, category: "Interior" });
    expect(out.map((p) => p.id)).toEqual(["towel"]);
  });

  it("matches search case-insensitively on the name", () => {
    const out = filterProducts(products, { ...base, search: "tIrE" });
    expect(out.map((p) => p.id)).toEqual(["tire"]);
  });

  it("filters by price range using the selling price", () => {
    const out = filterProducts(products, { ...base, priceRange: [0, 20] });
    expect(out.map((p) => p.id)).toEqual(["tire"]);
  });

  it("sorts by price ascending and descending", () => {
    expect(
      filterProducts(products, { ...base, sortBy: "price-low" }).map((p) => p.id),
    ).toEqual(["tire", "towel", "wax"]);
    expect(
      filterProducts(products, { ...base, sortBy: "price-high" }).map((p) => p.id),
    ).toEqual(["wax", "towel", "tire"]);
  });

  it("sorts by newest", () => {
    expect(
      filterProducts(products, { ...base, sortBy: "latest" }).map((p) => p.id),
    ).toEqual(["towel", "wax", "tire"]);
  });

  it("does not mutate the input array", () => {
    const order = products.map((p) => p.id);
    filterProducts(products, { ...base, sortBy: "price-high" });
    expect(products.map((p) => p.id)).toEqual(order);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterProducts(products, { ...base, search: "nope" })).toEqual([]);
  });
});
