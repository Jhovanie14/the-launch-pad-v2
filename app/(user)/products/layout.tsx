import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// /products itself is a server component and could carry its own metadata, but
// this layout still owns the default for the route group. Child routes
// (cart, success, [slug]) override it with their own.
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
  // Every shop page is on the 24/7 Bay tokens (each opts into .lp-theme).
  return children;
}
