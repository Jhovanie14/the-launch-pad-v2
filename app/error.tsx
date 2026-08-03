"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Phone } from "lucide-react";

/**
 * Root error boundary. Without this, an unhandled runtime error anywhere in the
 * app renders Next's default error screen — no branding, no recovery path, and
 * no way for the customer to reach us. Booking and checkout are the flows most
 * likely to hit one, and those are the worst places to strand someone.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-20">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Something went wrong
        </p>

        <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-balance">
          This page didn't load
        </h1>

        <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
          The problem is on our end, not yours. Trying again usually clears it.
          If you were in the middle of a booking or payment, nothing was charged.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md border px-6 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            Return home
          </Link>
        </div>

        <div className="mt-10 border-t pt-6 space-y-2.5 text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Need a hand?{" "}
            <a
              href="tel:8322198320"
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              (832) 219-8320
            </a>
          </p>
          {/* The digest is what makes a support call actionable — it is the only
              handle that ties this screen to a specific server-side log entry. */}
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground/70">
              Reference: {error.digest}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
