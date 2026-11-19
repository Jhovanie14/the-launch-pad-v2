import { isCommercialPlan } from "@/lib/pricing/flockPricing";

export interface MenuItem {
  id: string;
  name: string;
  duration: number;
  features: string[];
  price: number;
  /** Price with the holiday sale applied; null when there is no sale. */
  salePrice: number | null;
}

export interface MenuCategory {
  key: string;
  /** A valid HTML id fragment for the category ("quick-service"). */
  slug: string;
  label: string;
  minDuration: number;
  maxDuration: number;
  items: MenuItem[];
}

export interface ServicesPageModel {
  categories: MenuCategory[];
  /** The lowest price on the menu, as the menu shows it (sale price when on sale). */
  detailingFrom: number | null;
  /** The cheapest non-commercial membership plan. */
  membershipFrom: { price: number; planName: string } | null;
  sale: { active: boolean; percent: number };
}

/** Known categories come first, in this order; any others follow as they appear. */
const KNOWN_ORDER = ["quick service", "express detail"];

const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

/**
 * Everything the public services page shows, built from real rows so that no
 * price or claim on the page can drift from the database.
 */
export function buildServicesPage(input: {
  services: {
    id: string;
    name: string;
    duration: number;
    price: number | string;
    features: string[] | null;
    category: string | null;
  }[];
  plans: { name: string; monthly_price: number | string; is_commercial: boolean | null; is_active?: boolean | null }[];
  saleActive: boolean;
  saleDiscount: number;
}): ServicesPageModel {
  const { saleActive, saleDiscount } = input;
  // Same rounding booking charges with (applyHolidaySale, then toFixed(2) in
  // computeBookingAmount), so a page price never differs from the charge by a cent.
  const onSale = (price: number) => Number((price * (1 - saleDiscount)).toFixed(2));

  const byKey = new Map<string, MenuItem[]>();
  const firstSeen: string[] = [];
  for (const s of input.services) {
    const key = (s.category ?? "").trim().toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, []);
      firstSeen.push(key);
    }
    const price = Number(s.price);
    byKey.get(key)!.push({
      id: s.id,
      name: s.name,
      duration: Number(s.duration) || 0,
      features: s.features ?? [],
      price,
      salePrice: saleActive ? onSale(price) : null,
    });
  }

  const order = [
    ...KNOWN_ORDER.filter((k) => byKey.has(k)),
    ...firstSeen.filter((k) => !KNOWN_ORDER.includes(k)),
  ];
  const categories: MenuCategory[] = order.map((key) => {
    const items = byKey.get(key)!;
    const durations = items.map((i) => i.duration);
    return {
      key,
      slug: key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "other",
      label: sentenceCase(key),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      items,
    };
  });

  const shown = categories.flatMap((c) => c.items).map((i) => i.salePrice ?? i.price);
  const personalPlans = input.plans
    .filter((p) => p.is_active !== false && !isCommercialPlan(p))
    .map((p) => ({ price: Number(p.monthly_price), planName: p.name }))
    .filter((p) => p.price > 0)
    .sort((a, b) => a.price - b.price);

  return {
    categories,
    detailingFrom: shown.length ? Math.min(...shown) : null,
    membershipFrom: personalPlans[0] ?? null,
    sale: { active: saleActive, percent: Math.round(saleDiscount * 100) },
  };
}
