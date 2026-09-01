import type { Metadata } from "next";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description and
// self-referencing canonical rather than inheriting the homepage's.
export const metadata: Metadata = {
  title: "Customer Reviews",
  description:
    "What Houston drivers say about The Launch Pad - 4.9 out of 5 from more than 500 reviews of our wash bays, express detailing and memberships.",
  alternates: { canonical: "/reviews" },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
