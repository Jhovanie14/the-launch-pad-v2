"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SubscriptionUpgradeSuccessPage() {
  return (
    <div>
      <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-balance text-ink">
        <CheckCircle2 aria-hidden className="size-8 shrink-0 text-brand-blue" />
        Your plan is upgraded
      </h1>
      <p className="mt-2 max-w-prose text-base leading-relaxed text-ink-muted">
        Your billing cycle and payment were updated automatically. Billing
        shows your new plan, price and next payment date.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard/billing"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          See it in Billing
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-paper px-4 font-semibold text-ink ring-1 ring-line hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
