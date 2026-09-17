import type { Metadata } from "next";
import { Anton } from "next/font/google";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// Headline face for the storefront only. Anton is a single-weight display cut
// that earns its keep at large sizes; body copy stays on Geist. Loading it here
// rather than in the root layout keeps it off every other route.
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

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
  // `storefront` swaps the shadcn tokens for the black-and-gold palette across
  // the whole shop, so the catalog, cart and confirmation read as one place
  // rather than the catalog being a dark island in a light site.
  return (
    <div className={`storefront ${anton.variable} bg-background text-foreground`}>
      {children}
    </div>
  );
}
