import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description, canonical
// and social card rather than inheriting the homepage's.
const TITLE = "Contact & Location";
const DESCRIPTION =
  "Find The Launch Pad at 10410 S Main St, Houston, TX 77025. Call (832) 219-8320 or send a message. Self-service bays are open 24 hours a day.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/contact" }),
  twitter: twitter({ title: TITLE, description: DESCRIPTION }),
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
