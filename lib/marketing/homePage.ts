// The home page's approved copy. Facts only: no rating counts or price
// superlatives until they are verified against a real source (PRODUCT.md).

export const HOME_REASONS: { title: string; detail: string }[] = [
  { title: "Open around the clock", detail: "Self-service bays, 24/7" },
  { title: "Pro equipment", detail: "High-pressure wash, foam brush, spot-free rinse" },
  { title: "Detailing by appointment", detail: "Thursday to Sunday, booked online" },
  { title: "Memberships, no contract", detail: "Monthly or yearly, cancel anytime" },
];

export interface HomeReview {
  text: string;
  author: string;
  source: "Google";
}

/**
 * Real Google reviews, quoted word for word from the screenshots in
 * public/reviews/ (image10, image11, image12). Testimonials must never be
 * invented (PRODUCT.md); add more only from a real, checkable review.
 */
export const HOME_REVIEWS: HomeReview[] = [
  {
    text: "Amazing car wash experience! I literally pulled up and they got My Tahoe cleaned inside out in about 40 minutes for a great price! Very attentive to detail and I love how they have a Free Air for your tires! I love that there's a food truck there every evening who serves up some amazing authentic Indian food. Very well lit up in the evenings.",
    author: "Arsalan K.",
    source: "Google",
  },
  {
    text: "Easily the best car wash I've went to! Armando was so friendly and explained everything in detail. His great service alone is a key factor in this becoming the ONLY car wash I'll be coming to in Houston!",
    author: "Vilma C.",
    source: "Google",
  },
  {
    text: "It's a great place, always clean and nice and I like how it's kept and I go every week.",
    author: "El guero T.",
    source: "Google",
  },
];
