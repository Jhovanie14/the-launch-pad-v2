"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductRow } from "@/types/db";
import { ProductVideo } from "./product-video";
import { AddToCartButton, PriceTag } from "./product-actions";

/**
 * One featured product: a landscape clip against its copy, sides alternating
 * down the page.
 *
 * This is the tier that lets a small catalog still feel like a launch. It stays
 * a curated 3-6 products however large the catalog grows, so the page never
 * turns into an endless scroll of full-height panels.
 */
export function FeaturedProduct({
  product,
  index,
}: {
  product: ProductRow;
  index: number;
}) {
  const mediaFirst = index % 2 === 0;

  return (
    <section className="border-t border-border/60 py-16 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: mediaFirst ? -32 : 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className={mediaFirst ? "lg:order-1" : "lg:order-2"}
        >
          <ProductVideo
            src={product.video_url}
            poster={product.image_url}
            alt={product.name}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-video w-full"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className={mediaFirst ? "lg:order-2" : "lg:order-1"}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-gold">
            {product.category}
          </p>
          <h2 className="mt-4 font-display text-4xl uppercase leading-tight sm:text-5xl">
            {product.name}
          </h2>
          {product.description && (
            <p className="mt-5 max-w-lg text-muted-foreground">
              {product.description}
            </p>
          )}

          <PriceTag product={product} size="lg" className="mt-7" />

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <AddToCartButton product={product} size="lg" />
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="rounded-none uppercase tracking-widest"
            >
              <Link href={`/products/${product.slug}`}>
                Details <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {product.stock > 0 && product.stock <= 5 && (
            <p className="mt-4 text-sm text-gold-soft">
              Only {product.stock} left in stock
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
