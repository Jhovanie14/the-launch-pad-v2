"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import type { ProductRow } from "@/types/db";
import { AddToCartButton, PriceTag } from "./product-actions";
import { ecommercePayload, toAnalyticsItem } from "@/lib/analytics/ecommerce";
import { trackEvent } from "@/lib/analytics/gtag";

/**
 * Grid card: portrait image, no video.
 *
 * The product photography is shot 9:16 while the clips are 16:9, so swapping
 * one for the other on hover would make the card jump. The grid stays stills
 * only -- which also keeps it fast at fifty products -- and video is used where
 * it has room to work: the featured panels and the detail page.
 */
export function ProductCard({ product, index }: { product: ProductRow; index: number }) {
  const soldOut = product.stock === 0;

  // Fires on either route into the product page, so the click-through rate is
  // not split between the image and the title.
  const trackSelect = () =>
    trackEvent("select_item", ecommercePayload([toAnalyticsItem(product)]));

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.5,
        // Stagger across the row, but cap it so late rows are not left waiting.
        delay: Math.min(index, 7) * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative flex flex-col border border-border/60 bg-card transition-colors duration-300 hover:border-gold/60"
    >
      <Link
        href={`/products/${product.slug}`}
        onClick={trackSelect}
        className="relative block aspect-[3/4] overflow-hidden"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Sold out
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[0.65rem] uppercase tracking-[0.25em] text-gold">
          {product.category}
        </p>
        <h3 className="mt-2 text-base font-medium leading-snug">
          <Link
            href={`/products/${product.slug}`}
            onClick={trackSelect}
            className="hover:text-gold"
          >
            {product.name}
          </Link>
        </h3>
        <PriceTag product={product} className="mt-3" />
        <AddToCartButton product={product} size="sm" className="mt-4 w-full" />
      </div>
    </motion.article>
  );
}
