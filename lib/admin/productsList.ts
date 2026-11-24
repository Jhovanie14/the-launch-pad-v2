// The admin products list: its filter chips, search, what each listing still
// needs, and the stock maths behind "Receive stock".

import { LOW_STOCK_THRESHOLD } from "@/lib/products/inventory";
import type { ProductRow } from "@/types/db";

export type ProductChip = "all" | "low" | "out" | "needs" | "hidden";

/** A full name longer than this reads badly on cards without a short name. */
const LONG_NAME = 48;
const MAX_STOCK = 100_000;

const blank = (v: string | null | undefined) => !v || v.trim() === "";

/** What a listing is missing, in the order the drawer's sections ask for it. */
export function needsList(p: ProductRow): string[] {
  const needs: string[] = [];
  if (blank(p.image_url)) needs.push("photo");
  if (blank(p.video_url)) needs.push("video");
  if (blank(p.description)) needs.push("description");
  if (p.name.length > LONG_NAME && blank(p.display_name)) needs.push("short name");
  return needs;
}

/** "Needs content" keeps the long-standing rule: photo, video or description. */
const needsContent = (p: ProductRow) => blank(p.image_url) || blank(p.video_url) || blank(p.description);

export function matchesChip(p: ProductRow, chip: ProductChip): boolean {
  switch (chip) {
    case "all":
      return true;
    case "low":
      return p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD;
    case "out":
      return p.stock === 0;
    case "needs":
      return needsContent(p);
    case "hidden":
      return !p.is_active;
  }
}

export function chipCounts(products: ProductRow[]): Record<ProductChip, number> {
  const chips: ProductChip[] = ["all", "low", "out", "needs", "hidden"];
  return Object.fromEntries(chips.map((c) => [c, products.filter((p) => matchesChip(p, c)).length])) as Record<
    ProductChip,
    number
  >;
}

export function matchesProductSearch(p: ProductRow, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  return [p.name, p.display_name ?? "", p.category].some((field) => field.toLowerCase().includes(query));
}

/** "Receive" adds 1..100000; "Set exact count" accepts 0..100000. */
export function parseStockInput(
  raw: string,
  mode: "add" | "set",
): { ok: true; value: number } | { ok: false; error: string } {
  const text = raw.trim();
  const value = Number(text);
  const min = mode === "add" ? 1 : 0;
  if (!text || !Number.isInteger(value) || value < min || value > MAX_STOCK) {
    return {
      ok: false,
      error: mode === "add" ? "Enter how many arrived, from 1 to 100,000" : "Enter a count from 0 to 100,000",
    };
  }
  return { ok: true, value };
}

export function receivePatch(current: number, value: number, mode: "add" | "set"): number {
  return mode === "add" ? current + value : value;
}
