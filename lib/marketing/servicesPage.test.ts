import { describe, expect, it } from "vitest";
import { buildServicesPage } from "./servicesPage";

const svc = (id: string, name: string, price: number, duration: number, category: string, features: string[] | null = ["x"]) => ({
  id,
  name,
  price,
  duration,
  category,
  features,
});

const services = [
  svc("qe", "Quick Exterior Wash", 25, 15, "quick service"),
  svc("qi", "Quick Interior Refresh", 25, 15, "quick service"),
  svc("cc", "Classic Complete", 45, 30, "quick service"),
  svc("ee", "Express Exterior Detail", 40, 20, "express detail"),
  svc("ei", "Express Interior Detail", 40, 25, "express detail"),
  svc("ec", "Express Complete Detail", 65, 45, "express detail"),
];

const plans = [
  { name: "Express Detail", monthly_price: 59.99, is_commercial: false },
  { name: "Commercial Wash", monthly_price: 29.99, is_commercial: true },
  { name: "Quick Service", monthly_price: 39.99, is_commercial: false },
];

const build = (over: Partial<Parameters<typeof buildServicesPage>[0]> = {}) =>
  buildServicesPage({ services, plans, saleActive: true, saleDiscount: 0.05, ...over });

describe("buildServicesPage", () => {
  it("orders quick service then express detail, with sentence-case labels and duration ranges", () => {
    const m = build();
    expect(m.categories.map((c) => c.label)).toEqual(["Quick service", "Express detail"]);
    expect(m.categories[0]).toMatchObject({ key: "quick service", minDuration: 15, maxDuration: 30 });
    expect(m.categories[1]).toMatchObject({ minDuration: 20, maxDuration: 45 });
    expect(m.categories[0].items.map((i) => i.id)).toEqual(["qe", "qi", "cc"]);
  });

  it("sale on → sale prices and detailingFrom 23.75", () => {
    const m = build();
    expect(m.categories[0].items[0]).toMatchObject({ price: 25, salePrice: 23.75 });
    expect(m.detailingFrom).toBe(23.75);
    expect(m.sale).toEqual({ active: true, percent: 5 });
  });

  it("sale off → no sale prices, detailingFrom 25", () => {
    const m = build({ saleActive: false });
    expect(m.categories.flatMap((c) => c.items).every((i) => i.salePrice === null)).toBe(true);
    expect(m.detailingFrom).toBe(25);
    expect(m.sale.active).toBe(false);
  });

  it("membershipFrom is the cheapest non-commercial plan", () => {
    expect(build().membershipFrom).toEqual({ price: 39.99, planName: "Quick Service" });
  });

  it("only commercial plans → membershipFrom null", () => {
    expect(build({ plans: [plans[1]] }).membershipFrom).toBeNull();
    expect(build({ plans: [] }).membershipFrom).toBeNull();
  });

  it("no services → no categories and detailingFrom null", () => {
    const m = build({ services: [] });
    expect(m.categories).toEqual([]);
    expect(m.detailingFrom).toBeNull();
  });

  it("an unknown category follows the known ones under its own name", () => {
    const m = build({ services: [svc("cer", "Ceramic Coat", 120, 60, "ceramic"), ...services] });
    expect(m.categories.map((c) => c.label)).toEqual(["Quick service", "Express detail", "Ceramic"]);
  });

  it("null features → []", () => {
    const m = build({ services: [svc("a", "A", 10, 10, "quick service", null)] });
    expect(m.categories[0].items[0].features).toEqual([]);
  });
});
