import { GOOGLE_REVIEWS, type GoogleReview } from "./reviews";

// The home page's approved copy. Facts only: no rating counts or price
// superlatives until they are verified against a real source (PRODUCT.md).

export const HOME_REASONS: { title: string; detail: string }[] = [
  { title: "Open around the clock", detail: "Self-service bays, 24/7" },
  { title: "Pro equipment", detail: "High-pressure wash, foam brush, spot-free rinse" },
  { title: "Detailing by appointment", detail: "Thursday to Sunday, booked online" },
  { title: "Memberships, no contract", detail: "Monthly or yearly, cancel anytime" },
];

export interface HomeService {
  key: "self" | "detail" | "member";
  name: string;
  lede: string;
  facts: string[];
  /** Real photos of the shop only. Some images in public/ are AI or stock. */
  photo: { src: string; alt: string };
  link: { href: string; label: string };
}

/** "Three services, one location": no prices here, the hero tiles show them. */
export const HOME_SERVICES: HomeService[] = [
  {
    key: "self",
    name: "Self-service bays",
    lede: "Wash it your way, any time of the day or night.",
    facts: ["Open 24/7", "High-pressure wash and foam brush", "Spot-free rinse and vacuums", "Pay with coins or tap to pay"],
    photo: { src: "/self-service-bay.jpg", alt: "A freshly washed black car in one of our self-service bays" },
    link: { href: "/self-service", label: "How the bays work" },
  },
  {
    key: "detail",
    name: "Express detailing",
    lede: "Our team cleans your car inside and out.",
    facts: ["Thursday to Sunday, 9:30 AM–6:30 PM", "Book online, by appointment", "Quick service and express detail packages"],
    photo: { src: "/professional-express-car-detailing-2.png", alt: "A white sedan being foam-washed in one of our bays" },
    link: { href: "/services#menu", label: "See the menu" },
  },
  {
    key: "member",
    name: "Membership",
    lede: "Keep your car clean all month for one price.",
    facts: ["Unlimited washes", "Monthly or yearly plans", "No contract, cancel anytime"],
    photo: { src: "/express-detailing-subscription-1.jpg", alt: "The clean interior of a car in one of our bays" },
    link: { href: "/pricing", label: "See plans" },
  },
];

export type HomeReview = GoogleReview;

const HOME_AUTHORS = ["Arsalan K.", "Vilma C.", "El guero T."];

/** Three of the real Google reviews (lib/marketing/reviews.ts) for the home page. */
export const HOME_REVIEWS: HomeReview[] = HOME_AUTHORS.map((author) => {
  const review = GOOGLE_REVIEWS.find((r) => r.author === author);
  if (!review) throw new Error(`Home review by ${author} is not in GOOGLE_REVIEWS`);
  return review;
});
