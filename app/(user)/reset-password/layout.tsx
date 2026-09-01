import type { Metadata } from "next";

// Auth and checkout funnel steps have no business in search results: they are
// useless as landing pages and dilute the crawl budget for pages that matter.
export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
