// URL slugs for /products/[slug]. Kept as pure functions alongside the rest of
// the product logic so they stay inside Vitest's lib/** include.
//
// The 20260918000000_product_media.sql migration backfills slugs for rows that
// predate the column using the same shape (lowercase, non-alphanumerics to a
// single hyphen, numeric suffix on collision). The SQL does not fold accents --
// it only had to cover the handful of existing rows, whereas every product
// created from here on goes through slugify().

const FALLBACK = "product";

/**
 * Turn a product name into a URL segment: "Ultra Plush 1200 GSM" ->
 * "ultra-plush-1200-gsm". Returns `fallback` when the name contains nothing
 * usable, so callers never have to handle an empty slug.
 */
export function slugify(name: string, fallback: string = FALLBACK): string {
  const slug = name
    .normalize("NFD")
    // Strip the combining marks left behind by NFD, so "é" folds to "e"
    // rather than being dropped along with the rest of the punctuation.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? fallback : slug;
}

/**
 * slugify() plus collision handling: the first free "-2", "-3", ... suffix.
 * `taken` is every slug already in the catalog. The unique index on
 * products.slug is the real guarantee; this just avoids the round trip.
 */
export function uniqueSlug(
  name: string,
  taken: Iterable<string>,
  fallback: string = FALLBACK,
): string {
  const used = taken instanceof Set ? taken : new Set(taken);
  const base = slugify(name, fallback);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
