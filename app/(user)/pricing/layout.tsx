import type { Metadata } from "next";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description and
// self-referencing canonical rather than inheriting the homepage's.
export const metadata: Metadata = {
  title: "Membership Plans & Pricing",
  description:
    "Unlimited wash memberships from $39.99 a month. No contract, no vehicle upcharges, and a family discount on every additional car on the plan.",
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
