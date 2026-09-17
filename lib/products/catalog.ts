// Catalog shaping for the products page: which products lead, which fill the
// grid, and how the grid responds to search and filters.
//
// The page is built to read as intentional at both ends of the catalog's life:
// a handful of products at launch, up to ~50 later. The featured tier is
// curated and stays a constant size; the grid absorbs the growth. Filters stay
// hidden until there is enough to browse for them to earn their space.

import { unitPrice } from "./cart";

/** The fields catalog shaping needs. ProductRow satisfies this. */
export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  sale_price: number | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

export type SortOption = "curated" | "price-low" | "price-high" | "latest";

/** Below this many products, search and filters are chrome rather than help. */
export const FILTER_THRESHOLD = 12;

/** Slider ceiling used when the catalog is empty. */
const DEFAULT_CEILING = 100;

function byCurated(a: CatalogProduct, b: CatalogProduct): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

/**
 * Split the catalog into the featured tier (large video panels) and the grid.
 * Both groups come back in curated order.
 */
export function splitCatalog<T extends CatalogProduct>(
  products: T[],
): { featured: T[]; rest: T[] } {
  const sorted = [...products].sort(byCurated);
  return {
    featured: sorted.filter((p) => p.is_featured),
    rest: sorted.filter((p) => !p.is_featured),
  };
}

/** Category filter options, alphabetical, with "all" pinned first. */
export function categoriesOf(products: CatalogProduct[]): string[] {
  const unique = [...new Set(products.map((p) => p.category))].sort();
  return ["all", ...unique];
}

/** Highest selling price, rounded up — the top of the price slider. */
export function priceCeiling(products: CatalogProduct[]): number {
  if (products.length === 0) return DEFAULT_CEILING;
  return Math.ceil(Math.max(...products.map((p) => unitPrice(p))));
}

export function shouldShowFilters(count: number): boolean {
  return count >= FILTER_THRESHOLD;
}

export interface CatalogFilters {
  category: string;
  search: string;
  priceRange: [number, number];
  sortBy: SortOption;
}

/** Apply the grid's search, category, price and sort. Never mutates `products`. */
export function filterProducts<T extends CatalogProduct>(
  products: T[],
  { category, search, priceRange, sortBy }: CatalogFilters,
): T[] {
  const needle = search.trim().toLowerCase();
  const [min, max] = priceRange;

  const matched = products.filter((product) => {
    if (category !== "all" && product.category !== category) return false;
    if (needle !== "" && !product.name.toLowerCase().includes(needle)) return false;
    const price = unitPrice(product);
    return price >= min && price <= max;
  });

  return matched.sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return unitPrice(a) - unitPrice(b);
      case "price-high":
        return unitPrice(b) - unitPrice(a);
      case "latest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "curated":
      default:
        return byCurated(a, b);
    }
  });
}
