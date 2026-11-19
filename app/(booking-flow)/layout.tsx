import type { Metadata } from "next";
import { Toaster } from "sonner";
import BookingHeader from "@/components/booking/BookingHeader";

// Auth and checkout funnel steps have no business in search results: they are
// useless as landing pages and dilute the crawl budget for pages that matter.
export const metadata: Metadata = {
  title: "Book a service",
  robots: { index: false, follow: false },
};

// The guest booking frame: a focused, navy-headed flow instead of the
// marketing navbar and footer. Signed-in customers book inside the dashboard
// shell with the same steps. URLs (/service, /datetime, /confirmation) are
// unchanged; the success page stays in the marketing layout.
export default function BookingFlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp-theme min-h-screen bg-canvas text-ink">
      <BookingHeader />
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
