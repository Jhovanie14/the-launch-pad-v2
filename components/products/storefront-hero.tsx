"use client";

import { ArrowDown } from "lucide-react";
import { FLAME_BUTTON } from "@/components/booking/ui/focus";
import { cn } from "@/lib/utils";
import { ProductVideo } from "./product-video";

interface StorefrontHeroProps {
  videoUrl: string | null;
  posterUrl: string | null;
  headline: string;
  subcopy: string;
  ctaLabel: string;
  /** Days an unpaid reservation is held once ready (store settings). */
  holdDays: number;
  /** id of the range section the CTA scrolls to; its heading is focused. */
  targetId: string;
}

/**
 * The shop's opening section, on white: headline, copy and the one Flame
 * action on the left, the brand film in a framed panel on the right.
 *
 * Everything here is editable from admin (store_settings), so a seasonal
 * campaign is a content change rather than a deploy. The CTA glides to the
 * range (a jump for visitors who reduce motion) and moves focus to its heading.
 */
export function StorefrontHero({
  videoUrl,
  posterUrl,
  headline,
  subcopy,
  ctaLabel,
  holdDays,
  targetId,
}: StorefrontHeroProps) {
  function scrollToRange(e: React.MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById(targetId);
    if (!target) return; // the plain anchor still works
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    const heading = target.querySelector<HTMLElement>("h2");
    heading?.focus({ preventScroll: true });
    history.replaceState(null, "", `#${targetId}`);
  }

  const facts = [
    "Pick up at the shop",
    "Pay online or at the counter",
    `Held ${holdDays} ${holdDays === 1 ? "day" : "days"} once it's ready`,
  ];

  return (
    <section className="bg-canvas text-ink">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pt-10 pb-6 sm:px-6 sm:pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:pb-10">
        <div>
          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.035em] text-balance lg:text-6xl">
            {headline}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-muted">{subcopy}</p>
          <a href={`#${targetId}`} onClick={scrollToRange} className={cn(FLAME_BUTTON, "mt-7")}>
            {ctaLabel}
            <ArrowDown aria-hidden className="size-4" />
          </a>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            {facts.map((fact) => (
              <li key={fact} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-night" />
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl bg-night shadow-[0_18px_40px_-24px_rgb(8_20_52/0.9)] ring-1 ring-white/10">
          <ProductVideo
            src={videoUrl}
            poster={posterUrl}
            alt=""
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="aspect-[16/10] w-full"
          />
        </div>
      </div>
    </section>
  );
}
