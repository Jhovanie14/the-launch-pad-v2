import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description, canonical
// and social card rather than inheriting the homepage's.
const TITLE = "How It Works";
const DESCRIPTION =
  "Book online, pick a time, and arrive. How booking, self-service bay check-in and membership washes work at The Launch Pad in Houston.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/how-it-works" }),
  twitter: twitter({ title: TITLE, description: DESCRIPTION }),
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
