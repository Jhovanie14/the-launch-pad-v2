import { describe, expect, it } from "vitest";
import { CTA_DESTINATIONS, ctaFor, normaliseCta } from "@/lib/blog/cta";

describe("normaliseCta", () => {
  it("keeps a known destination and trims the button text", () => {
    expect(normaliseCta({ destination: "membership", buttonText: "  Join now " })).toEqual({
      destination: "membership",
      buttonText: "Join now",
    });
  });

  it("drops an unknown destination", () => {
    expect(normaliseCta({ destination: "javascript:alert(1)", buttonText: "" })).toBeNull();
    expect(normaliseCta({ destination: "nope", buttonText: "Go" })).toEqual({ destination: null, buttonText: "Go" });
  });

  it("returns null for junk", () => {
    expect(normaliseCta(null)).toBeNull();
    expect(normaliseCta("booking")).toBeNull();
  });
});

describe("ctaFor", () => {
  it.each([
    ["booking", "/service", "Book express detailing"],
    ["membership", "/pricing", "See membership plans"],
    ["self-service", "/self-service", "Find the self-service bays"],
    ["products", "/products", "Shop car care products"],
    ["contact", "/contact", "Get in touch"],
  ] as const)("%s links to %s", (destination, href, buttonText) => {
    expect(ctaFor({ destination, buttonText: "" })).toMatchObject({ href, buttonText });
  });

  it("uses custom button text when given", () => {
    expect(ctaFor({ destination: "products", buttonText: "Grab some tire shine" }).buttonText).toBe(
      "Grab some tire shine",
    );
  });

  it("falls back to booking under the one-roof heading", () => {
    expect(ctaFor(null)).toMatchObject({ href: "/service", heading: "Everything under one roof" });
    expect(ctaFor({ destination: null, buttonText: "Book today" })).toMatchObject({
      href: "/service",
      buttonText: "Book today",
    });
  });

  it("has one entry per destination id", () => {
    expect(new Set(CTA_DESTINATIONS.map((d) => d.id)).size).toBe(CTA_DESTINATIONS.length);
  });
});
