import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description, canonical
// and social card rather than inheriting the homepage's.
const TITLE = "Car Care Products";
const DESCRIPTION =
  "Waxes, tire shine and detailing supplies from The Launch Pad. Order online and collect at our Houston location on S Main St.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/products" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/products" }),
  twitter: twitter({ title: TITLE, description: DESCRIPTION }),
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
