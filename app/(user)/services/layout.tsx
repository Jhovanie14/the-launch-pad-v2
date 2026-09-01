import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";
import {
  BAY_MINIMUM_CASH,
  usd,
} from "@/lib/pricing/selfServiceRates";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description, canonical
// and social card rather than inheriting the homepage's.
const TITLE = "Car Wash & Detailing Services";
const DESCRIPTION =
  `Self-service bays from ${usd(BAY_MINIMUM_CASH)}, express detailing from $25, and unlimited monthly wash plans from $39.99. One price for every vehicle - no size upcharges.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/services" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/services" }),
  twitter: twitter({ title: TITLE, description: DESCRIPTION }),
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
