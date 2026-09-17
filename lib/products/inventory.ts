// Catalog health for the admin products screen.
//
// Kept pure and tested because these numbers drive decisions -- what to
// restock, what still needs a video before launch -- and a quietly wrong count
// is worse than no count at all.

import { round2, unitPrice } from "./cart";

/** At or below this many units, a product is flagged as running low. */
export const LOW_STOCK_THRESHOLD = 5;

interface InventoryProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
}

export interface InventorySummary {
  total: number;
  active: number;
  hidden: number;
  featured: number;
  outOfStock: number;
  lowStock: number;
  /** Stock on hand valued at the selling price. */
  inventoryValue: number;
}

export function inventorySummary(products: InventoryProduct[]): InventorySummary {
  const summary: InventorySummary = {
    total: products.length,
    active: 0,
    hidden: 0,
    featured: 0,
    outOfStock: 0,
    lowStock: 0,
    inventoryValue: 0,
  };

  for (const product of products) {
    if (product.is_active) summary.active++;
    else summary.hidden++;
    if (product.is_featured) summary.featured++;

    if (product.stock === 0) summary.outOfStock++;
    else if (product.stock <= LOW_STOCK_THRESHOLD) summary.lowStock++;

    summary.inventoryValue += unitPrice(product) * product.stock;
  }

  summary.inventoryValue = round2(summary.inventoryValue);
  return summary;
}

export interface ContentGaps {
  missingImage: number;
  missingVideo: number;
  missingDescription: number;
  /** Products missing at least one of the above, counted once each. */
  incompleteProducts: number;
}

function blank(value: string | null): boolean {
  return value === null || value.trim() === "";
}

/**
 * What still needs content. With a launch date and photography arriving in
 * batches, this is the view that answers "what is left to do".
 */
export function contentGaps(products: InventoryProduct[]): ContentGaps {
  const gaps: ContentGaps = {
    missingImage: 0,
    missingVideo: 0,
    missingDescription: 0,
    incompleteProducts: 0,
  };

  for (const product of products) {
    const noImage = blank(product.image_url);
    const noVideo = blank(product.video_url);
    const noDescription = blank(product.description);

    if (noImage) gaps.missingImage++;
    if (noVideo) gaps.missingVideo++;
    if (noDescription) gaps.missingDescription++;
    if (noImage || noVideo || noDescription) gaps.incompleteProducts++;
  }

  return gaps;
}
