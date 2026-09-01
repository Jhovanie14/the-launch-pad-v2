import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description, canonical
// and social card rather than inheriting the homepage's.
const TITLE = "Frequently Asked Questions";
const DESCRIPTION =
  "Hours, membership terms, what the self-service bays cost, how billing works, and what to expect from an express detail at The Launch Pad in Houston.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/faq" }),
  twitter: twitter({ title: TITLE, description: DESCRIPTION }),
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
