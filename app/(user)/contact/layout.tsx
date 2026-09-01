import type { Metadata } from "next";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description and
// self-referencing canonical rather than inheriting the homepage's.
export const metadata: Metadata = {
  title: "Contact & Location",
  description:
    "Find The Launch Pad at 10410 S Main St, Houston, TX 77025. Call (832) 219-8320 or send a message. Self-service bays are open 24 hours a day.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
