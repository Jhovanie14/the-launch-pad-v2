import { GOOGLE_REVIEWS, type GoogleReview } from "./reviews";

// The home page's approved copy. Facts only: no rating counts or price
// superlatives until they are verified against a real source (PRODUCT.md).

export const HOME_REASONS: { title: string; detail: string }[] = [
  { title: "Open around the clock", detail: "Self-service bays, 24/7" },
  { title: "Pro equipment", detail: "High-pressure wash, foam brush, spot-free rinse" },
  { title: "Detailing by appointment", detail: "Thursday to Sunday, booked online" },
  { title: "Memberships, no contract", detail: "Monthly or yearly, cancel anytime" },
];

export type HomeReview = GoogleReview;

const HOME_AUTHORS = ["Arsalan K.", "Vilma C.", "El guero T."];

/** Three of the real Google reviews (lib/marketing/reviews.ts) for the home page. */
export const HOME_REVIEWS: HomeReview[] = HOME_AUTHORS.map((author) => {
  const review = GOOGLE_REVIEWS.find((r) => r.author === author);
  if (!review) throw new Error(`Home review by ${author} is not in GOOGLE_REVIEWS`);
  return review;
});
