"use client";

import Link from "next/link";
import { CalendarX, XCircle } from "lucide-react";
import { Subscription } from "@/types";

/**
 * A plain note above the membership card when it is ending or has ended.
 * Text and icon carry the meaning; no warning colours.
 */
export default function SubscriptionCancelInfo({
  subscription,
}: {
  subscription: Subscription;
}) {
  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  if (subscription.status === "active" && subscription.cancel_at_period_end) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-paper p-5 ring-1 ring-line">
        <CalendarX aria-hidden className="mt-0.5 size-5 shrink-0 text-ink" />
        <div>
          <p className="font-bold text-ink">
            Your membership ends{endDate ? ` on ${endDate}` : " at the end of this billing period"}
          </p>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            You keep your washes until then, and you won&apos;t be charged again. Changed your mind?{" "}
            <Link
              href="/dashboard/help"
              className="rounded font-semibold text-ink underline underline-offset-4 hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Contact us
            </Link>{" "}
            before that date.
          </p>
        </div>
      </div>
    );
  }

  if (subscription.status === "canceled") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-paper p-5 ring-1 ring-line">
        <XCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
        <div>
          <p className="font-bold text-ink">
            Your membership ended{endDate ? ` on ${endDate}` : ""}
          </p>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            You can join again anytime from{" "}
            <Link
              href="/dashboard/pricing"
              className="rounded font-semibold text-ink underline underline-offset-4 hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              membership plans
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return null;
}
