import { applySale } from "./pricingDisplay";

export interface BundleSuggestion {
  pkg: { id: string; name: string; features: string[] };
  currentTotal: number;
  packageTotal: number;
}

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Suggest Express Complete Detail only when it really costs less than what the
 * customer picked (service plus extras, both with the holiday sale applied as
 * the page shows prices). Never for a member whose service is free, and never
 * a claim about which extras the package replaces: nothing in the data maps
 * add-ons to package features.
 */
export function bundleSuggestion(opts: {
  chosen: { id: string; price: number };
  addOns: { price: number }[];
  catalog: { id: string; name: string; price: number; features: string[] | null }[];
  isServiceFree: boolean;
}): BundleSuggestion | null {
  if (opts.isServiceFree) return null;
  const pkg = opts.catalog.find((s) => s.name.toLowerCase().trim().includes("express complete"));
  if (!pkg || pkg.id === opts.chosen.id) return null;

  const extras = opts.addOns.reduce((sum, a) => sum + Number(a.price), 0);
  const currentTotal = cents(applySale(Number(opts.chosen.price) + extras));
  const packageTotal = cents(applySale(Number(pkg.price)));
  if (currentTotal <= packageTotal) return null;

  return {
    pkg: { id: pkg.id, name: pkg.name, features: pkg.features ?? [] },
    currentTotal,
    packageTotal,
  };
}
