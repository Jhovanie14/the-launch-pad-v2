import type { Metadata } from "next";
import {
  BAY_MINIMUM_CASH,
  usd,
} from "@/lib/pricing/selfServiceRates";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description and
// self-referencing canonical rather than inheriting the homepage's.
export const metadata: Metadata = {
  title: "Car Wash & Detailing Services",
  description:
    `Self-service bays from ${usd(BAY_MINIMUM_CASH)}, express detailing from $25, and unlimited monthly wash plans from $39.99. One price for every vehicle - no size upcharges.`,
  alternates: { canonical: "/services" },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
