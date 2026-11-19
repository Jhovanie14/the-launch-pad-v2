import { describe, expect, it } from "vitest";
import { HOME_REASONS, HOME_REVIEWS } from "./homePage";

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
