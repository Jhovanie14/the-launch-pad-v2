"use client";

import Link from "next/link";
import { useState } from "react";
import { RotateCcw, Star } from "lucide-react";
import { ReviewForm } from "@/components/user/review-form";
import { formatShortDate, rebookHref, type VisitItem } from "@/lib/dashboard/home";
import { cn } from "@/lib/utils";

const KIND_DOT: Record<VisitItem["kind"], string> = {
  detail: "bg-amber-400",
  self_service: "bg-sky-400",
  order: "bg-violet-400",
};

const REVIEW_WINDOW_DAYS = 14;

// Focus outline that stays visible (3:1+) on a white surface.
const LIGHT_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950";
const ROW_ACTION = cn(
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50",
  LIGHT_FOCUS,
);

/**
 * Past details, bay visits and product orders in one list, colour-coded the
 * way the marketing site codes the services. A detail can be booked again in
 * one tap; the latest detail, if recent and not yet reviewed, asks how it went.
 */
export function VisitsList({
  visits,
  userId,
  reviewedIds,
  onReviewed,
  error,
  onRetry,
  now,
}: {
  visits: VisitItem[];
  userId: string;
  reviewedIds: Set<string>;
  onReviewed: (bookingId: string) => void;
  error: string | null;
  onRetry: () => void;
  now: Date;
}) {
  const [reviewing, setReviewing] = useState<string | null>(null);
  const latestDetail = visits.find((v) => v.kind === "detail");
  const askForReview =
    !!latestDetail &&
    !reviewedIds.has(latestDetail.id) &&
    now.getTime() - new Date(latestDetail.at).getTime() < REVIEW_WINDOW_DAYS * 86_400_000;

  return (
    <section aria-labelledby="visits-heading" className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="visits-heading" className="text-xl font-black tracking-tight text-slate-950">
          Your visits
        </h2>
        <Link
          href="/dashboard/bookings"
          className={cn("rounded text-sm font-medium text-slate-700 underline-offset-4 hover:underline", LIGHT_FOCUS)}
        >
          All bookings
        </Link>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-slate-700">
          {error}{" "}
          <button
            type="button"
            onClick={onRetry}
            className={cn("rounded font-semibold text-slate-950 underline underline-offset-4", LIGHT_FOCUS)}
          >
            Try again
          </button>
        </p>
      ) : visits.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          Your details, bay visits and orders will show up here after your first visit.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-slate-100">
          {visits.map((v) => (
            <li key={`${v.kind}-${v.id}`} className="py-3">
              <div className="flex items-center gap-4">
                <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", KIND_DOT[v.kind])} />
                <time dateTime={v.at} className="w-14 shrink-0 text-sm font-semibold tabular-nums text-slate-500">
                  {formatShortDate(v.at)}
                </time>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-950">{v.title}</span>
                  {v.detail && <span className="block text-sm text-slate-600">{v.detail}</span>}
                </span>
              </div>
              {v.kind === "detail" && v.booking && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {askForReview && latestDetail?.id === v.id && (
                    <button type="button" onClick={() => setReviewing(v.id)} className={ROW_ACTION}>
                      <Star aria-hidden className="size-4" /> How was it?
                    </button>
                  )}
                  <Link href={rebookHref(v.booking)} className={ROW_ACTION}>
                    <RotateCcw aria-hidden className="size-4" /> Book again
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {reviewing && (
        <ReviewForm
          bookingId={reviewing}
          userId={userId}
          open={!!reviewing}
          onOpenChange={(open) => !open && setReviewing(null)}
          onSubmitted={() => {
            onReviewed(reviewing);
            setReviewing(null);
          }}
        />
      )}
    </section>
  );
}
