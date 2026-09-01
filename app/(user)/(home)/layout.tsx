import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";

// The homepage is a client component and cannot export metadata, so it lives
// in a (home) route group - which adds no path segment - purely so this layout
// can carry its metadata without leaking it to every other (user) route.
const TITLE = "Car Wash & Express Detailing in Houston, TX";
const DESCRIPTION =
  "The Launch Pad brings 24/7 self-service wash bays, professional express detailing and unlimited wash memberships together at 10410 S Main St, Houston.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/" }),
  twitter: twitter({ title: TITLE, description: DESCRIPTION }),
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
