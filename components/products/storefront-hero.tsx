"use client";

import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductVideo } from "./product-video";

interface StorefrontHeroProps {
  videoUrl: string | null;
  posterUrl: string | null;
  headline: string;
  subcopy: string;
  ctaLabel: string;
  /** Anchor the CTA scrolls to. */
  targetId: string;
}

/**
 * Opening panel of the storefront: the brand film behind the range's name.
 *
 * Everything here is editable from admin (store_settings), so a seasonal
 * campaign is a content change rather than a deploy. The copy renders whether
 * or not a film has been uploaded -- an empty hero still reads as a title card
 * over the poster still.
 */
export function StorefrontHero({
  videoUrl,
  posterUrl,
  headline,
  subcopy,
  ctaLabel,
  targetId,
}: StorefrontHeroProps) {
  return (
    <section className="relative isolate flex min-h-[85svh] items-end overflow-hidden">
      <ProductVideo
        src={videoUrl}
        poster={posterUrl}
        alt=""
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full"
      />

      {/* Scrim: the copy has to stay legible over whatever footage is loaded,
          so the gradient is weighted to the bottom where the type sits. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-32 sm:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">
            The Launch Pad · Pro Series
          </p>
          <h1 className="font-display text-5xl uppercase leading-[0.95] sm:text-7xl lg:text-8xl">
            {headline}
          </h1>
          <div className="mt-6 h-px w-24 bg-gold" />
          <p className="mt-6 max-w-lg text-base text-muted-foreground sm:text-lg">
            {subcopy}
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 rounded-none px-8 text-sm uppercase tracking-widest"
          >
            <a href={`#${targetId}`}>{ctaLabel}</a>
          </Button>
        </motion.div>
      </div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground"
      >
        {/* A slow eased drift rather than a springy keyframe: that kind of
            motion reads as playful, which is the opposite of what the rest of
            this page is doing. The drift sits on the inner element so it
            cannot fight the centring transform on the parent. */}
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className="block"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </motion.div>
    </section>
  );
}
