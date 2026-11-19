import { describe, expect, it } from "vitest";
import { copyrightLine, FOOTER_GROUPS, LEGAL_LINKS, SHOP } from "./footer";

const group = (title: string) => FOOTER_GROUPS.find((g) => g.title === title)?.links.map((l) => [l.name, l.href]);

describe("footer content", () => {
  it("services: Detailing goes to /services", () => {
    expect(group("Services")).toEqual([
      ["Self-service", "/self-service"],
      ["Detailing", "/services"],
      ["Membership", "/pricing"],
      ["Products", "/products"],
    ]);
  });

  it("the launch pad group in order", () => {
    expect(group("The Launch Pad")).toEqual([
      ["About us", "/about"],
      ["How it works", "/how-it-works"],
      ["Reviews", "/reviews"],
      ["Blog", "/blog"],
      ["FAQ", "/faq"],
      ["Contact", "/contact"],
    ]);
  });

  it("hours and contact copy", () => {
    expect(SHOP.hours).toEqual(["Self-service bays: open 24/7", "Detailing: Thu–Sun, 9:30 AM–6:30 PM"]);
    expect(SHOP.address).toBe("10410 S Main St, Houston, TX 77025");
    expect(SHOP.phoneDisplay).toBe("(832) 219-8320");
    expect(SHOP.phoneHref).toBe("tel:+18322198320");
    expect(SHOP.email).toBe("info@thelaunchpadwash.com");
    expect(SHOP.mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=10410/);
  });

  it("copyright uses the given year", () => {
    expect(copyrightLine(new Date("2027-03-01T12:00:00Z"))).toBe("© 2027 The Launch Pad. All rights reserved.");
  });

  it("internal links start with /", () => {
    const all = [...FOOTER_GROUPS.flatMap((g) => g.links), ...LEGAL_LINKS];
    expect(all.every((l) => l.href.startsWith("/"))).toBe(true);
    expect(LEGAL_LINKS.map((l) => l.href)).toEqual(["/terms", "/privacy", "/cookies"]);
  });
});
