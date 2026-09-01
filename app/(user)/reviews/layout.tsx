import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description, canonical
// and social card rather than inheriting the homepage's.
const TITLE = "Customer Reviews";
const DESCRIPTION =
  "What Houston drivers say about The Launch Pad - 4.9 out of 5 from more than 500 reviews of our wash bays, express detailing and memberships.";

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
