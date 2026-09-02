import type { Metadata } from "next";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import Link from "next/link";

// Without this the tab reads "The Launch Pad | Car Wash & Express Detailing in
// Houston, TX" on a page that is telling the visitor it found nothing.
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-20">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Error 404
        </p>

        <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-balance">
          We couldn't find that page
        </h1>

        <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
          The page may have moved, or the link that brought you here may be out
          of date. Everything else is still where you left it.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return home
          </Link>
          <Link
            href="/services"
            className="inline-flex h-11 items-center justify-center rounded-md border px-6 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            Browse services
          </Link>
        </div>

        {/* A dead end is a good place to give someone a real way to reach us. */}
        <div className="mt-10 border-t pt-6 space-y-2.5 text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            10410 S Main St, Houston, TX 77025
          </p>
          <p className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" aria-hidden="true" />
            <a
              href="tel:8322198320"
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              (832) 219-8320
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
