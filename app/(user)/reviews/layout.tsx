import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// The route's own title, description, canonical and social card. No rating
// numbers: only claims that are verified against a real source (PRODUCT.md).
const TITLE = "Customer Reviews";
const DESCRIPTION =
  "Real Google reviews from Houston drivers about The Launch Pad's 24/7 self-service bays, express detailing and memberships.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/reviews" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/reviews" }),
  twitter: twitter({ title: TITLE, description: DESCRIPTION }),
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
