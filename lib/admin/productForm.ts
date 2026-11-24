// The admin product form: its fields as typed, the rules for saving, and
// whether anything has changed (so closing the drawer can ask first).

import { toGallery } from "@/lib/products/media";
import type { ProductRow } from "@/types/db";

export interface ProductForm {
  name: string;
  /** The optional short name the shop shows (products.display_name). */
  display_name: string;
  description: string;
  category: string;
  price: string;
  sale_price: string;
  image_url: string;
  video_url: string;
  gallery: string[];
  stock: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: string;
}

export const EMPTY_FORM: ProductForm = {
  name: "",
  display_name: "",
  description: "",
  category: "",
  price: "",
  sale_price: "",
  image_url: "",
  video_url: "",
  gallery: [],
  stock: "0",
  is_active: true,
  is_featured: false,
  sort_order: "0",
};

export const SHORT_NAME_MAX = 60;

export interface ProductPayload {
  name: string;
  display_name: string | null;
  description: string | null;
  category: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  video_url: string | null;
  gallery: string[];
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  updated_at: string;
}

export function formFromProduct(p: ProductRow): ProductForm {
  return {
    name: p.name,
    display_name: p.display_name ?? "",
    description: p.description ?? "",
    category: p.category,
    price: String(p.price),
    sale_price: p.sale_price === null ? "" : String(p.sale_price),
    image_url: p.image_url ?? "",
    video_url: p.video_url ?? "",
    gallery: toGallery(p.gallery),
    stock: String(p.stock),
    is_active: p.is_active,
    is_featured: p.is_featured,
    sort_order: String(p.sort_order),
  };
}

/** Validate the form and build the row to save (create and update share it). */
export function buildProductPayload(
  f: ProductForm,
  now: Date,
): { ok: true; payload: ProductPayload } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error });
  const name = f.name.trim();
  const category = f.category.trim();
  if (!name || !category) return fail("Name and category are required");

  const shortName = f.display_name.trim();
  if (shortName.length > SHORT_NAME_MAX) return fail(`Keep the short name to ${SHORT_NAME_MAX} characters`);

  const price = f.price.trim() === "" ? NaN : Number(f.price);
  if (!Number.isFinite(price) || price < 0) return fail("Price must be a positive number");

  const salePrice = f.sale_price.trim() === "" ? null : Number(f.sale_price);
  if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0)) {
    return fail("Sale price must be a positive number");
  }

  const stock = Number(f.stock);
  if (f.stock.trim() === "" || !Number.isInteger(stock) || stock < 0) return fail("Stock must be a whole number");

  const sortOrder = Number(f.sort_order);
  if (f.sort_order.trim() === "" || !Number.isInteger(sortOrder)) return fail("Sort order must be a whole number");

  return {
    ok: true,
    payload: {
      name,
      display_name: shortName || null,
      description: f.description.trim() || null,
      category,
      price,
      sale_price: salePrice,
      image_url: f.image_url || null,
      video_url: f.video_url || null,
      gallery: f.gallery,
      stock,
      is_active: f.is_active,
      is_featured: f.is_featured,
      sort_order: sortOrder,
      updated_at: now.toISOString(),
    },
  };
}

/** Has the admin changed anything since the drawer opened? */
export function isDirty(f: ProductForm, initial: ProductForm): boolean {
  return (Object.keys(initial) as (keyof ProductForm)[]).some((key) => {
    const a = f[key];
    const b = initial[key];
    if (Array.isArray(a) && Array.isArray(b)) return a.length !== b.length || a.some((v, i) => v !== b[i]);
    return a !== b;
  });
}

/**
 * How a save treats stock. Unedited, it is left out, so a sale or a delivery
 * received while the drawer was open is never overwritten. Edited, it is
 * written only if the count is still the one the drawer opened with.
 */
export function stockWrite(f: ProductForm, initial: ProductForm): { include: false } | { include: true; expected: number } {
  if (f.stock.trim() === initial.stock.trim()) return { include: false };
  return { include: true, expected: Number(initial.stock) };
}
