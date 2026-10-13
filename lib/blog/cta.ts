/**
 * Where a post sends its reader next. A fixed list rather than a free-form
 * link: every destination is a page that earns revenue, and the heading and
 * pitch for each are written once here instead of per post.
 */

export const CTA_DESTINATIONS = [
  {
    id: "booking",
    label: "Express detailing — booking",
    href: "/service",
    heading: "Book express detailing in Houston",
    body: "Interior deep clean, wax, polish, windows and trim — booked online in a couple of minutes at 10410 S Main St.",
    buttonText: "Book express detailing",
  },
  {
    id: "membership",
    label: "Membership plans",
    href: "/pricing",
    heading: "Unlimited washes, one monthly price",
    body: "Wash any vehicle as often as you like. No contract, cancel anytime.",
    buttonText: "See membership plans",
  },
  {
    id: "self-service",
    label: "Self-service bays",
    href: "/self-service",
    heading: "Wash it yourself, 24/7",
    body: "Professional-grade bays, high-pressure hoses and vacuum stations, open around the clock.",
    buttonText: "Find the self-service bays",
  },
  {
    id: "products",
    label: "Car care products",
    href: "/products",
    heading: "The products we use on every car",
    body: "Order online and collect at our Houston store, or have it delivered.",
    buttonText: "Shop car care products",
  },
  {
    id: "contact",
    label: "Contact us",
    href: "/contact",
    heading: "Questions? Talk to the team",
    body: "Ask about detailing, memberships or fleet accounts and we'll get back to you.",
    buttonText: "Get in touch",
  },
] as const;

export type CtaDestination = (typeof CTA_DESTINATIONS)[number]["id"];
export type BlogCta = { destination: CtaDestination | null; buttonText: string };

export const CTA_BUTTON_MAX = 60;

const FALLBACK = {
  href: "/service",
  heading: "Everything under one roof",
  body: "Self-service bays, express detailing and an unlimited membership — all at one location on S Main St.",
  buttonText: "Book express detailing",
};

export function isCtaDestination(v: unknown): v is CtaDestination {
  return typeof v === "string" && CTA_DESTINATIONS.some((d) => d.id === v);
}

/** Never throws: anything malformed is null (the page then shows the fallback). */
export function normaliseCta(input: unknown): BlogCta | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const destination = isCtaDestination(raw.destination) ? raw.destination : null;
  const buttonText =
    typeof raw.buttonText === "string" ? raw.buttonText.trim().slice(0, CTA_BUTTON_MAX) : "";
  if (!destination && !buttonText) return null;
  return { destination, buttonText };
}

/** What the CTA panel renders. Always returns something — the panel is on every post. */
export function ctaFor(cta: BlogCta | null): { href: string; heading: string; body: string; buttonText: string } {
  const target = CTA_DESTINATIONS.find((d) => d.id === cta?.destination) ?? FALLBACK;
  return {
    href: target.href,
    heading: target.heading,
    body: target.body,
    buttonText: cta?.buttonText || target.buttonText,
  };
}
