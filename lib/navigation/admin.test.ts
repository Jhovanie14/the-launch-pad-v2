import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV,
  ADMIN_NAV_FOOTER,
  activeHref,
  adminNav,
  badgeLabel,
  isSuperAdminRoute,
  type AdminNavSection,
} from "./admin";

const allItems = () => [...ADMIN_NAV.flatMap((s) => s.items), ADMIN_NAV_FOOTER];
const names = (sections: AdminNavSection[]) => sections.flatMap((s) => s.items.map((i) => i.name));

describe("admin nav config", () => {
  it("groups and items are the approved copy", () => {
    expect(ADMIN_NAV.map((s) => [s.label, s.items.map((i) => i.name)])).toEqual([
      [null, ["Dashboard"]],
      ["Today", ["Bookings", "Store orders", "Messages", "Pay & tip QR codes"]],
      ["Customers", ["Customers & staff", "Memberships"]],
      ["What we sell", ["Services", "Add-ons", "Products", "Promo codes"]],
      ["Fleet", ["Fleet inquiries", "Fleet contracts & invoices"]],
      ["Marketing", ["Campaigns", "Direct email", "Blog"]],
    ]);
    expect(ADMIN_NAV_FOOTER.name).toBe("Settings");
  });

  it("hrefs match the spec", () => {
    expect(allItems().map((i) => i.href)).toEqual([
      "/admin/dashboard",
      "/admin/booking",
      "/admin/orders",
      "/admin/contact",
      "/admin/qr",
      "/admin/users",
      "/admin/subscriptions",
      "/admin/services",
      "/admin/addons",
      "/admin/products",
      "/admin/promo",
      "/admin/fleet-inquiry",
      "/admin/fleet-payment-management",
      "/admin/campaigns",
      "/admin/broadcast",
      "/admin/blog",
      "/admin/settings",
    ]);
  });

  it("Store orders and Messages carry their badges", () => {
    const items = allItems();
    expect(items.find((i) => i.name === "Store orders")?.badge).toBe("orders");
    expect(items.find((i) => i.name === "Messages")?.badge).toBe("messages");
  });

  it("every icon is distinct", () => {
    expect(new Set(allItems().map((i) => i.icon)).size).toBe(17);
  });
});

describe("adminNav roles", () => {
  const GATED = ["Memberships", "Services", "Add-ons", "Promo codes"];

  it("super admin sees everything", () => {
    expect(adminNav("super_admin")).toEqual(ADMIN_NAV);
  });

  it("regular, null and unknown user types lose the super-admin items", () => {
    for (const type of ["admin", null, undefined, "customer"]) {
      const visible = names(adminNav(type));
      for (const g of GATED) expect(visible).not.toContain(g);
      expect(visible).toContain("Products");
      expect(visible).toContain("Customers & staff");
    }
  });

  it("empty sections are dropped", () => {
    const item = { ...ADMIN_NAV[0].items[0], requires: "super_admin" as const };
    expect(adminNav("admin", [{ label: "X", items: [item] }])).toEqual([]);
  });
});

describe("current page", () => {
  it("sub-pages light their parent", () => {
    expect(activeHref("/admin/blog/new")).toBe("/admin/blog");
    expect(activeHref("/admin/blog/abc/edit")).toBe("/admin/blog");
    expect(activeHref("/admin/dashboard")).toBe("/admin/dashboard");
    expect(activeHref("/admin/settings")).toBe("/admin/settings");
    expect(activeHref("/admin")).toBeNull();
  });

  it("super-admin routes", () => {
    expect(isSuperAdminRoute("/admin/promo")).toBe(true);
    expect(isSuperAdminRoute("/admin/services/x")).toBe(true);
    expect(isSuperAdminRoute("/admin/products")).toBe(false);
  });

  it("badge label", () => {
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(3)).toBe("3");
    expect(badgeLabel(10)).toBe("9+");
  });

  it("every admin page is in the nav", () => {
    const root = join(process.cwd(), "app");
    const pages: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (f === "page.tsx") pages.push(p);
      }
    };
    walk(join(root, "admin"));
    const routes = pages.map((p) => p.slice(root.length).replace(/\\/g, "/").replace(/\/page\.tsx$/, ""));
    expect(routes.length).toBeGreaterThan(15);
    const missing = routes.filter((r) => r !== "/admin" && activeHref(r) === null);
    expect(missing).toEqual([]);
  });
});
