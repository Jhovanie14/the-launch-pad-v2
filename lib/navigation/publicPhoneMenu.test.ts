import { describe, expect, it } from "vitest";
import { phoneMenuCurrent, publicPhoneMenu } from "./publicPhoneMenu";

const names = (links: { name: string }[]) => links.map((l) => l.name);

describe("publicPhoneMenu", () => {
  it("signed out: primary, more, no account", () => {
    const menu = publicPhoneMenu({ signedIn: false });
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
    const menu = publicPhoneMenu({ signedIn: true });
    expect(menu.account.map((l) => [l.name, l.href])).toEqual([
      ["Dashboard", "/dashboard"],
      ["Bookings", "/dashboard/bookings"],
      ["Billing", "/dashboard/billing"],
      ["Profile and settings", "/dashboard/settings"],
    ]);
  });

  it("has no cart row: the cart is an icon in the bar, next to the menu button", () => {
    for (const signedIn of [true, false]) {
      const menu = publicPhoneMenu({ signedIn });
      const all = [...menu.primary, ...menu.more, ...menu.account];
      expect(all.some((l) => l.href === "/products/cart")).toBe(false);
    }
  });

  it("no Login anywhere", () => {
    for (const signedIn of [true, false]) {
      const menu = publicPhoneMenu({ signedIn });
      const all = [...menu.primary, ...menu.more, ...menu.account];
      expect(all.some((l) => /log ?in/i.test(l.name) || l.href === "/login")).toBe(false);
    }
  });
});

describe("phoneMenuCurrent", () => {
  it("the cart page counts as the shop", () => {
    expect(phoneMenuCurrent("/products/cart", "/products")).toBe(true);
  });

  it("a product page still marks Products current", () => {
    expect(phoneMenuCurrent("/products/some-wax", "/products")).toBe(true);
    expect(phoneMenuCurrent("/blog/a-post", "/blog")).toBe(true);
  });
});
