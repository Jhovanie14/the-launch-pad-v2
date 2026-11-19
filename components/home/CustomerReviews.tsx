import { Star } from "lucide-react";
import { HOME_REVIEWS } from "@/lib/marketing/homePage";

/** "What customers say": three still review cards on navy. */
export function CustomerReviews() {
  return (
    <section aria-labelledby="reviews-title" className="bg-night py-16 text-on-night md:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-8">
          <h2 id="reviews-title" className="text-4xl font-black leading-[1.05] tracking-[-0.025em] md:text-5xl">
            What customers say
          </h2>
          <p className="max-w-md leading-relaxed text-on-night-muted">
            A few words from people who wash and detail with us.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {HOME_REVIEWS.map((review) => (
            <li key={review.author}>
              <figure className="flex h-full flex-col rounded-2xl bg-dusk p-6 ring-1 ring-paper/10">
                <p className="flex gap-0.5 text-flame">
                  <span className="sr-only">5 out of 5 stars</span>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} aria-hidden className="size-4 fill-current" />
                  ))}
                </p>
                <blockquote className="mt-4 flex-1 leading-relaxed">{review.text}</blockquote>
                <figcaption className="mt-6 flex items-end justify-between gap-4 text-sm">
                  <span>
                    <span className="block font-bold">{review.author}</span>
                    <span className="text-on-night-subtle">{review.vehicle}</span>
                  </span>
                  <span className="shrink-0 text-on-night-subtle">{review.source} review</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
