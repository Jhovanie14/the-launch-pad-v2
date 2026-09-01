import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description, canonical
// and social card rather than inheriting the homepage's.
const TITLE = "Membership Plans & Pricing";
const DESCRIPTION =
  "Unlimited wash memberships from $39.99 a month. No contract, no vehicle upcharges, and a family discount on every additional car on the plan.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/pricing" }),
  twitter: twitter({ title: TITLE, description: DESCRIPTION }),
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
