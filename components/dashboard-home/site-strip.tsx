"use client";

import Link from "next/link";
import { Droplets, MapPin, ShoppingBag, Sparkles } from "lucide-react";
import { DIRECTIONS_URL } from "./now-card";
import { cn } from "@/lib/utils";

const SITE_LINK = cn(
  "flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-ink hover:bg-line-soft",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
);

/** Where and when: the facts someone checks before driving over. */
export function SiteStrip() {
  return (
    <section aria-labelledby="site-heading" className="rounded-2xl bg-paper p-5 text-sm ring-1 ring-line">
      <h2 id="site-heading" className="text-base font-black tracking-tight text-ink">
        10410 S Main St, Houston
      </h2>
      <dl className="mt-3 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-2 whitespace-nowrap text-ink-muted">
            <Droplets aria-hidden className="size-4 text-svc-self-mark" /> Self-service bays
          </dt>
          <dd className="font-semibold text-ink">Open 24/7</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-2 whitespace-nowrap text-ink-muted">
            <Sparkles aria-hidden className="size-4 text-svc-detail-mark" /> Express detailing
          </dt>
          <dd className="whitespace-nowrap text-right font-semibold text-ink">
            Thu–Sun
            <span className="block font-medium text-ink-muted">9:30 AM–6:30 PM</span>
          </dd>
        </div>
      </dl>
      <div className="mt-4 -mx-2 border-t border-line-soft pt-2">
        <a href={DIRECTIONS_URL} target="_blank" rel="noreferrer" className={SITE_LINK}>
          <MapPin aria-hidden className="size-4 text-brand-blue" /> Get directions
        </a>
        <Link href="/products" className={SITE_LINK}>
          <ShoppingBag aria-hidden className="size-4 text-brand-blue" /> Shop car care
        </Link>
        <Link href="/terms" className={cn(SITE_LINK, "font-medium text-ink-muted")}>
          Weather and closure policy
        </Link>
      </div>
    </section>
  );
}
