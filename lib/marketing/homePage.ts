// The home page's approved copy. Facts only: no ratings or "best price"
// claims until they are verified against a real source (PRODUCT.md).

export const HOME_REASONS: { title: string; detail: string }[] = [
  { title: "Open around the clock", detail: "Self-service bays, 24/7" },
  { title: "Pro equipment", detail: "High-pressure wash, foam brush, spot-free rinse" },
  { title: "Detailing by appointment", detail: "Thursday to Sunday, booked online" },
  { title: "Memberships, no contract", detail: "Monthly or yearly, cancel anytime" },
];

export interface HomeReview {
  text: string;
  author: string;
  vehicle: string;
  source: "Google" | "Yelp";
}

/** One review for each service line: self-service, detailing, membership. */
export const HOME_REVIEWS: HomeReview[] = [
  {
    text: "Best self-wash in Houston. Equipment is strong and bays are super clean.",
    author: "Ahmed S.",
    vehicle: "BMW 3 Series",
    source: "Google",
  },
  {
    text: "The express detailing service is amazing! My car looked brand new after they finished.",
    author: "Maria G.",
    vehicle: "Honda CR-V",
    source: "Yelp",
  },
  {
    text: "I've tried every car wash in the area and this is by far the best. The membership is worth every penny.",
    author: "Jason T.",
    vehicle: "Regular Customer",
    source: "Google",
  },
];
