import { describe, expect, it } from "vitest";
import { EMPTY_FORM, buildProductPayload, formFromProduct, isDirty, stockWrite, type ProductForm } from "./productForm";
import type { ProductRow } from "@/types/db";

const NOW = new Date("2026-11-24T16:00:00Z");
const valid: ProductForm = {
  ...EMPTY_FORM,
  name: "  The Launch Pad Utility Towels, 8-pack  ",
  display_name: " Utility towels, 8-pack ",
  description: " Soft. ",
  category: " Exterior care ",
  price: "14.69",
  stock: "2000",
  sort_order: "0",
  gallery: ["a.png", "b.png"],
};

const fails = (f: ProductForm) => {
  const r = buildProductPayload(f, NOW);
  expect(r.ok).toBe(false);
  return r.ok ? "" : r.error;
};

describe("buildProductPayload", () => {
  it("maps every field, trimmed", () => {
    const r = buildProductPayload(valid, NOW);
    expect(r).toEqual({
      ok: true,
      payload: {
        name: "The Launch Pad Utility Towels, 8-pack",
        display_name: "Utility towels, 8-pack",
        description: "Soft.",
        category: "Exterior care",
        price: 14.69,
        sale_price: null,
        image_url: null,
        video_url: null,
        gallery: ["a.png", "b.png"],
        stock: 2000,
        is_active: true,
        is_featured: false,
        sort_order: 0,
        updated_at: NOW.toISOString(),
      },
    });
  });

  it("a blank short name saves as not set", () => {
    const r = buildProductPayload({ ...valid, display_name: "   " }, NOW);
    expect(r.ok && r.payload.display_name).toBeNull();
  });

  it("refuses a short name over 60 characters", () => {
    expect(fails({ ...valid, display_name: "x".repeat(61) })).toBe("Keep the short name to 60 characters");
  });

  it("keeps the current rules", () => {
    expect(fails({ ...valid, name: " " })).toBe("Name and category are required");
    expect(fails({ ...valid, category: "" })).toBe("Name and category are required");
    expect(fails({ ...valid, price: "-1" })).toBe("Price must be a positive number");
    expect(fails({ ...valid, price: "abc" })).toBe("Price must be a positive number");
    expect(fails({ ...valid, sale_price: "-2" })).toBe("Sale price must be a positive number");
    expect(fails({ ...valid, stock: "2.5" })).toBe("Stock must be a whole number");
    expect(fails({ ...valid, stock: "-1" })).toBe("Stock must be a whole number");
    expect(fails({ ...valid, sort_order: "1.5" })).toBe("Sort order must be a whole number");
  });

  it("an empty sale price saves as none", () => {
    const r = buildProductPayload({ ...valid, sale_price: " " }, NOW);
    expect(r.ok && r.payload.sale_price).toBeNull();
  });
});

describe("formFromProduct and isDirty", () => {
  const product = {
    id: "p1",
    name: "Wheel brush",
    display_name: null,
    description: null,
    category: "Exterior care",
    price: 17.84,
    sale_price: null,
    image_url: null,
    video_url: null,
    gallery: ["x.png"],
    stock: 4,
    is_active: true,
    is_featured: false,
    sort_order: 2,
  } as unknown as ProductRow;

  it("turns nulls into empty fields", () => {
    expect(formFromProduct(product)).toEqual({
      name: "Wheel brush",
      display_name: "",
      description: "",
      category: "Exterior care",
      price: "17.84",
      sale_price: "",
      image_url: "",
      video_url: "",
      gallery: ["x.png"],
      stock: "4",
      is_active: true,
      is_featured: false,
      sort_order: "2",
    });
  });

  it("knows when something changed", () => {
    const initial = formFromProduct(product);
    expect(isDirty({ ...initial }, initial)).toBe(false);
    expect(isDirty({ ...initial, stock: "5" }, initial)).toBe(true);
    expect(isDirty({ ...initial, gallery: ["y.png"] }, initial)).toBe(true);
    expect(isDirty({ ...initial, gallery: [...initial.gallery] }, initial)).toBe(false);
  });
});

describe("stockWrite (saving never overwrites a newer count)", () => {
  const initial = { ...EMPTY_FORM, stock: "5" };
  it("leaves stock out of the save when it wasn't edited", () => {
    expect(stockWrite({ ...initial, name: "x" }, initial)).toEqual({ include: false });
  });
  it("when edited, writes only if the count is still the one the drawer opened with", () => {
    expect(stockWrite({ ...initial, stock: "8" }, initial)).toEqual({ include: true, expected: 5 });
  });
});
