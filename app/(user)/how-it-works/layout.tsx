import type { Metadata } from "next";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description and
// self-referencing canonical rather than inheriting the homepage's.
export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Book online, pick a time, and arrive. How booking, self-service bay check-in and membership washes work at The Launch Pad in Houston.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
