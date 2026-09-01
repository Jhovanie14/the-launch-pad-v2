import type { Metadata } from "next";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description and
// self-referencing canonical rather than inheriting the homepage's.
export const metadata: Metadata = {
  title: "Car Care Products",
  description:
    "Waxes, tire shine and detailing supplies from The Launch Pad. Order online and collect at our Houston location on S Main St.",
  alternates: { canonical: "/products" },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
