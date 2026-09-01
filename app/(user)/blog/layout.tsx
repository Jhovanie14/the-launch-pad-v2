import type { Metadata } from "next";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description and
// self-referencing canonical rather than inheriting the homepage's.
export const metadata: Metadata = {
  title: "Car Care Tips & News",
  description:
    "Practical car care advice from The Launch Pad in Houston - washing technique, protecting your paint, and getting the most out of a wash membership.",
  alternates: { canonical: "/blog" },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
