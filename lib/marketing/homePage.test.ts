import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_REASONS, HOME_REVIEWS, HOME_SERVICES } from "./homePage";
import { SHOP } from "./footer";

// AI-generated or stock images in public/: never shown as the shop.
const NOT_THE_SHOP = [
  "/professional-express-car-detailing.png",
  "/express-detailing-subscription.png",
  "/self-service-wash-2.jpg",
];

describe("home services", () => {
  it("services are the three approved cards", () => {
    expect(HOME_SERVICES.map(({ key, name, lede, facts, link }) => ({ key, name, lede, facts, link }))).toEqual([
      {
        key: "self",
        name: "Self-service bays",
        lede: "Wash it your way, any time of the day or night.",
        facts: ["Open 24/7", "High-pressure wash and foam brush", "Spot-free rinse and vacuums", "Pay with coins or tap to pay"],
        link: { href: "/self-service", label: "How the bays work" },
      },
      {
        key: "detail",
        name: "Express detailing",
        lede: "Our team cleans your car inside and out.",
        facts: ["Thursday to Sunday, 9:30 AM–6:30 PM", "Book online, by appointment", "Quick service and express detail packages"],
        link: { href: "/services#menu", label: "See the menu" },
      },
      {
        key: "member",
        name: "Membership",
        lede: "Keep your car clean all month for one price.",
        facts: ["Unlimited washes", "Monthly or yearly plans", "No contract, cancel anytime"],
        link: { href: "/pricing", label: "See plans" },
      },
    ]);
  });

  it("services use only the real shop photos", () => {
    const srcs = HOME_SERVICES.map((s) => s.photo.src);
    expect(srcs).toEqual([
      "/self-service-wash-1.jpg",
      "/professional-express-car-detailing-2.png",
      "/express-detailing-subscription-1.jpg",
    ]);
    for (const src of srcs) {
      expect(NOT_THE_SHOP).not.toContain(src);
      expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
    }
    for (const s of HOME_SERVICES) expect(s.photo.alt.length).toBeGreaterThan(10);
  });

  it("detailing hours match the footer", () => {
    const detail = HOME_SERVICES.find((s) => s.key === "detail")!;
    const hours = detail.facts.find((f) => f.includes("AM–"))!;
    const time = hours.slice(hours.indexOf(", ") + 2);
    expect(time).toBe("9:30 AM–6:30 PM");
    expect(SHOP.hours.some((h) => h.startsWith("Detailing") && h.endsWith(time))).toBe(true);
  });
});

describe("home page copy", () => {
  it("reasons are the four approved facts", () => {
    expect(HOME_REASONS).toEqual([
      { title: "Open around the clock", detail: "Self-service bays, 24/7" },
      { title: "Pro equipment", detail: "High-pressure wash, foam brush, spot-free rinse" },
      { title: "Detailing by appointment", detail: "Thursday to Sunday, booked online" },
      { title: "Memberships, no contract", detail: "Monthly or yearly, cancel anytime" },
    ]);
  });

  // PRODUCT.md: testimonials must never be fabricated. These are quoted word
  // for word from the Google review screenshots in public/reviews/.
  it("reviews are the real Google reviews from the screenshots", () => {
    expect(HOME_REVIEWS.map((r) => [r.author, r.source])).toEqual([
      ["Arsalan K.", "Google"],
      ["Vilma C.", "Google"],
      ["El guero T.", "Google"],
    ]);
    expect(HOME_REVIEWS[1].text).toBe(
      "Easily the best car wash I've went to! Armando was so friendly and explained everything in detail. His great service alone is a key factor in this becoming the ONLY car wash I'll be coming to in Houston!",
    );
    expect(HOME_REVIEWS[2].text).toBe(
      "It's a great place, always clean and nice and I like how it's kept and I go every week.",
    );
  });
});
