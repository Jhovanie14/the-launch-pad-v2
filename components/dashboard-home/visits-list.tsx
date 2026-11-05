"use client";

import Link from "next/link";
import { useState } from "react";
import { Droplets, RotateCcw, ShoppingBag, Sparkles, Star, type LucideIcon } from "lucide-react";
import { ReviewForm } from "@/components/user/review-form";
import { formatShortDate, rebookHref, type VisitItem } from "@/lib/dashboard/home";
import { cn } from "@/lib/utils";

/** Each kind wears its service colour and its own icon, so colour is never the only cue. */
const KIND_MARK: Record<VisitItem["kind"], { icon: LucideIcon; tone: string; label: string }> = {
  detail: { icon: Sparkles, tone: "text-svc-detail-mark", label: "Express detailing" },
  self_service: { icon: Droplets, tone: "text-svc-self-mark", label: "Self-service bay" },
  order: { icon: ShoppingBag, tone: "text-ink-subtle", label: "Product order" },
};

const REVIEW_WINDOW_DAYS = 14;

// Focus outline that stays visible (3:1+) on a white surface.
const LIGHT_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const ROW_ACTION = cn(
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink ring-1 ring-line hover:bg-canvas",
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
    <section aria-labelledby="visits-heading" className="rounded-2xl bg-white p-5 ring-1 ring-line sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="visits-heading" className="text-xl font-black tracking-tight text-ink">
          Your visits
        </h2>
        <Link
          href="/dashboard/bookings"
          className={cn("rounded text-sm font-medium text-ink-muted underline-offset-4 hover:underline", LIGHT_FOCUS)}
        >
          All bookings
        </Link>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-ink-muted">
          {error}{" "}
          <button
            type="button"
            onClick={onRetry}
            className={cn("rounded font-semibold text-ink underline underline-offset-4", LIGHT_FOCUS)}
          >
            Try again
          </button>
        </p>
      ) : visits.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Your details, bay visits and orders will show up here after your first visit.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-line-soft">
          {visits.map((v) => (
            <li key={`${v.kind}-${v.id}`} className="py-3">
              <div className="flex items-center gap-4">
                <KindMark kind={v.kind} />
                <time dateTime={v.at} className="w-14 shrink-0 text-sm font-semibold tabular-nums text-ink-subtle">
                  {formatShortDate(v.at)}
                </time>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{v.title}</span>
                  {v.detail && <span className="block text-sm text-ink-muted">{v.detail}</span>}
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

function KindMark({ kind }: { kind: VisitItem["kind"] }) {
  const { icon: Icon, tone, label } = KIND_MARK[kind];
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas ring-1 ring-line">
      <Icon aria-hidden className={cn("size-4", tone)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
