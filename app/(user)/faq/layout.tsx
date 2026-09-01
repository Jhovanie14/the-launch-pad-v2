import type { Metadata } from "next";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description and
// self-referencing canonical rather than inheriting the homepage's.
export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Hours, membership terms, what the self-service bays cost, how billing works, and what to expect from an express detail at The Launch Pad in Houston.",
  alternates: { canonical: "/faq" },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
