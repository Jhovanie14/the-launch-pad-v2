import type { Metadata } from "next";

// The homepage is a client component and cannot export metadata, so it lives
// in a (home) route group - which adds no path segment - purely so this layout
// can carry its metadata without leaking it to every other (user) route.
export const metadata: Metadata = {
  title: "Car Wash & Express Detailing in Houston, TX",
  description:
    "The Launch Pad brings 24/7 self-service wash bays, professional express detailing and unlimited wash memberships together at 10410 S Main St, Houston.",
  alternates: { canonical: "/" },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
