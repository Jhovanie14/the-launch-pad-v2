import { describe, expect, it } from "vitest";
import {
  LOW_STOCK_THRESHOLD,
  contentGaps,
  inventorySummary,
} from "./inventory";

type P = Parameters<typeof inventorySummary>[0][number];

const make = (over: Partial<P> & { id: string }): P => ({
  name: "Product",
  description: "A description",
  image_url: "/img.jpg",
  video_url: "/clip.mp4",
  price: 10,
  sale_price: null,
  stock: 10,
  is_active: true,
  is_featured: false,
  ...over,
});

describe("inventorySummary", () => {
  it("counts the catalog by status", () => {
    const summary = inventorySummary([
      make({ id: "a" }),
      make({ id: "b", is_active: false }),
      make({ id: "c", is_featured: true }),
    ]);
    expect(summary.total).toBe(3);
    expect(summary.active).toBe(2);
    expect(summary.hidden).toBe(1);
    expect(summary.featured).toBe(1);
  });

  it("separates out of stock from low stock", () => {
    const summary = inventorySummary([
      make({ id: "a", stock: 0 }),
      make({ id: "b", stock: LOW_STOCK_THRESHOLD }),
      make({ id: "c", stock: LOW_STOCK_THRESHOLD + 1 }),
    ]);
    expect(summary.outOfStock).toBe(1);
    expect(summary.lowStock).toBe(1);
  });

  it("values stock at the selling price", () => {
    const summary = inventorySummary([
      make({ id: "a", price: 20, sale_price: 12.5, stock: 4 }), // 50
      make({ id: "b", price: 10, stock: 3 }), // 30
    ]);
    expect(summary.inventoryValue).toBe(80);
  });

  it("returns zeroes for an empty catalog", () => {
    const summary = inventorySummary([]);
    expect(summary).toMatchObject({
      total: 0,
      active: 0,
      hidden: 0,
      featured: 0,
      outOfStock: 0,
      lowStock: 0,
      inventoryValue: 0,
    });
  });
});

describe("contentGaps", () => {
  it("counts products missing each kind of content", () => {
    const gaps = contentGaps([
      make({ id: "a", video_url: null }),
      make({ id: "b", image_url: null, description: null }),
      make({ id: "c" }),
    ]);
    expect(gaps.missingVideo).toBe(1);
    expect(gaps.missingImage).toBe(1);
    expect(gaps.missingDescription).toBe(1);
  });

  it("treats blank strings as missing, not as content", () => {
    const gaps = contentGaps([make({ id: "a", description: "   ", video_url: "" })]);
    expect(gaps.missingDescription).toBe(1);
    expect(gaps.missingVideo).toBe(1);
  });

  it("reports the total number of products needing attention once each", () => {
    // b is missing two things but is still one product to go and fix.
    const gaps = contentGaps([
      make({ id: "a", video_url: null }),
      make({ id: "b", image_url: null, description: null }),
      make({ id: "c" }),
    ]);
    expect(gaps.incompleteProducts).toBe(2);
  });

  it("is all zero when everything is complete", () => {
    expect(contentGaps([make({ id: "a" })])).toEqual({
      missingImage: 0,
      missingVideo: 0,
      missingDescription: 0,
      incompleteProducts: 0,
    });
  });
});
