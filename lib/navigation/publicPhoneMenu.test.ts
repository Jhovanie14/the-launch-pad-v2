import { describe, expect, it } from "vitest";
import { phoneMenuCurrent, publicPhoneMenu } from "./publicPhoneMenu";

const names = (links: { name: string }[]) => links.map((l) => l.name);

describe("publicPhoneMenu", () => {
  it("signed out: primary, more, no account", () => {
    const menu = publicPhoneMenu({ signedIn: false, cartCount: 0 });
    expect(menu.primary).toEqual([
      { name: "Home", href: "/" },
      { name: "Services", href: "/services" },
      { name: "Membership", href: "/pricing" },
      { name: "Self-service", href: "/self-service" },
      { name: "Products", href: "/products" },
    ]);
    expect(menu.more.map((l) => [l.name, l.href])).toEqual([
      ["About us", "/about"],
      ["FAQ", "/faq"],
      ["Blog", "/blog"],
      ["Contact", "/contact"],
    ]);
    expect(menu.account).toEqual([]);
  });

  it("signed in: account group", () => {
    const menu = publicPhoneMenu({ signedIn: true, cartCount: 0 });
    expect(menu.account.map((l) => [l.name, l.href])).toEqual([
      ["Dashboard", "/dashboard"],
      ["Bookings", "/dashboard/bookings"],
      ["Billing", "/dashboard/billing"],
      ["Profile and settings", "/dashboard/settings"],
    ]);
  });

  it("cart row only with items, named with the count", () => {
    expect(names(publicPhoneMenu({ signedIn: false, cartCount: 0 }).primary)).not.toContain("Cart (0)");
    const primary = publicPhoneMenu({ signedIn: false, cartCount: 2 }).primary;
    expect(primary[primary.length - 1]).toEqual({ name: "Cart (2)", href: "/products/cart" });
  });

  it("no Login anywhere", () => {
    for (const signedIn of [true, false]) {
      const menu = publicPhoneMenu({ signedIn, cartCount: 1 });
      const all = [...menu.primary, ...menu.more, ...menu.account];
      expect(all.some((l) => /log ?in/i.test(l.name) || l.href === "/login")).toBe(false);
    }
  });
});

describe("phoneMenuCurrent", () => {
  it("on the cart only the Cart row is current, not Products", () => {
    expect(phoneMenuCurrent("/products/cart", "/products/cart")).toBe(true);
    expect(phoneMenuCurrent("/products/cart", "/products")).toBe(false);
  });

  it("a product page still marks Products current", () => {
    expect(phoneMenuCurrent("/products/some-wax", "/products")).toBe(true);
    expect(phoneMenuCurrent("/blog/a-post", "/blog")).toBe(true);
  });
});
