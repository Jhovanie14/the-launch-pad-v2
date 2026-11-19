import { describe, expect, it } from "vitest";
import { GOOGLE_REVIEW_URL, GOOGLE_REVIEWS } from "./reviews";

// PRODUCT.md: testimonials must never be fabricated. Every quote here is word
// for word from a Google review screenshot in public/reviews/.
describe("Google reviews", () => {
  it("nine real reviews in screenshot order", () => {
    expect(GOOGLE_REVIEWS.map((r) => r.author)).toEqual([
      "Arsalan K.",
      "Vilma C.",
      "El guero T.",
      "Emi S.",
      "Harley Q.",
      "Uzair K.",
      "Edward A.",
      "Qassam J.",
      "Kanzah N.",
    ]);
    for (const r of GOOGLE_REVIEWS) expect(r.source).toBe("Google");
  });

  it("quotes are word for word", () => {
    const by = (a: string) => GOOGLE_REVIEWS.find((r) => r.author === a)?.text;
    expect(by("Emi S.")).toBe(
      "Self serve car wash. Clean, & well lit- felt safe while I was washing my car in the evening with my nieces. We had lots of fun especially with pink bubble gum foaming shampoo. There is even a food truck place right next door. Grabbed something to drink while washing car. Didn't use their free air- they need to put a label on how to use the free air though.",
    );
    expect(by("Kanzah N.")).toBe(
      "excellent service! armando and veronica did a great job! my car was the cleanest it's ever been and the interior of my car smelled amazing. i highly recommend their work",
    );
  });

  it("no duplicate quotes", () => {
    expect(new Set(GOOGLE_REVIEWS.map((r) => r.text)).size).toBe(GOOGLE_REVIEWS.length);
  });

  it("the review link is the Google listing", () => {
    expect(GOOGLE_REVIEW_URL).toBe("https://g.page/r/CZw2a77VbVUUEBM/review");
  });
});
