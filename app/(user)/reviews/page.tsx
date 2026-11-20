import { ExternalLink, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_ON_NIGHT, SURFACE } from "@/components/booking/ui/focus";
import { BookDetailButton } from "@/components/home/BookDetailButton";
import { GOOGLE_REVIEW_URL, GOOGLE_REVIEWS } from "@/lib/marketing/reviews";

// Real Google reviews only, word for word (lib/marketing/reviews.ts).
// Metadata lives in ./layout.tsx.
export default function ReviewsPage() {
  return (
    <main className="lp-theme flex-1 bg-canvas text-ink">
      <section aria-labelledby="reviews-title" className="bg-night text-on-night">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <h1
            id="reviews-title"
            className="text-5xl font-black leading-[0.95] tracking-[-0.035em] text-balance sm:text-6xl"
          >
            Customer reviews
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-on-night-muted">
            Real reviews from our Google listing, quoted word for word.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <BookDetailButton />
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex h-13 items-center justify-center gap-2 rounded-lg px-7 text-base font-bold text-on-night ring-1 ring-paper/25 transition-colors hover:bg-paper/10 motion-reduce:transition-none",
                FOCUS_ON_NIGHT,
              )}
            >
              Leave us a review
              <ExternalLink aria-hidden className="size-4" />
              <span className="sr-only">(opens Google in a new tab)</span>
            </a>
          </div>
        </div>
      </section>

      <section aria-label="Google reviews" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <ul className="gap-4 md:columns-2 lg:columns-3">
          {GOOGLE_REVIEWS.map((review) => (
            <li key={review.author} className="mb-4 break-inside-avoid">
              <figure className={cn(SURFACE, "p-6")}>
                <p className="flex gap-0.5 text-svc-detail-mark">
                  <span className="sr-only">5 out of 5 stars</span>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} aria-hidden className="size-4 fill-current" />
                  ))}
                </p>
                <blockquote className="mt-4 leading-relaxed">{review.text}</blockquote>
                <figcaption className="mt-5 flex items-end justify-between gap-4 text-sm">
                  <span className="font-bold">{review.author}</span>
                  <span className="shrink-0 text-ink-muted">{review.source} review</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
