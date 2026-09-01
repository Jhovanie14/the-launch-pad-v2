import type { Metadata } from "next";

// Auth and checkout funnel steps have no business in search results: they are
// useless as landing pages and dilute the crawl budget for pages that matter.
export const metadata: Metadata = {
  title: "Your plan",
  robots: { index: false, follow: false },
};

export default function PricingCartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
