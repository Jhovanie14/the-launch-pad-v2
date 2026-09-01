import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description, canonical
// and social card rather than inheriting the homepage's.
const TITLE = "Car Care Tips & News";
const DESCRIPTION =
  "Practical car care advice from The Launch Pad in Houston - washing technique, protecting your paint, and getting the most out of a wash membership.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/blog" }),
  twitter: twitter({ title: TITLE, description: DESCRIPTION }),
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
