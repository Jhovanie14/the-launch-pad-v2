"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductRow } from "@/types/db";
import { parseDescription, productTitle } from "@/lib/products/describe";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT, SURFACE } from "@/components/booking/ui/focus";
import { AddToCartButton, PriceTag } from "./product-actions";
import { ProductVideo } from "./product-video";

/**
 * A curated product as a wide card at the top of the range: its clip (or its
 * packshot) beside the title, a line about it, the price and the add button.
 */
export function FeaturedProduct({ product }: { product: ProductRow }) {
  const title = productTitle(product);
  const lead = parseDescription(product.description).about[0];
  const href = `/products/${product.slug}`;

  return (
    <article className={cn(SURFACE, "grid overflow-hidden sm:grid-cols-2")}>
      <div className="relative aspect-video border-b border-line-soft bg-paper sm:aspect-auto sm:min-h-64 sm:border-r sm:border-b-0">
        {product.video_url ? (
          <ProductVideo
            src={product.video_url}
            poster={product.image_url}
            alt=""
            sizes="(min-width: 640px) 45vw, 100vw"
            className="absolute inset-0 h-full w-full"
          />
        ) : product.image_url ? (
          <Image src={product.image_url} alt="" fill sizes="(min-width: 640px) 45vw, 100vw" className="object-contain p-6" />
        ) : null}
      </div>
      <div className="flex flex-col p-5 sm:p-7">
        <h3 className="text-xl leading-tight font-black tracking-tight text-balance sm:text-2xl">
          <Link href={href} className={cn("rounded hover:underline", FOCUS_ON_LIGHT)}>
            {title}
          </Link>
        </h3>
        {lead && <p className="mt-2 line-clamp-3 text-ink-muted">{lead}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
          <PriceTag product={product} />
          <AddToCartButton product={product} />
          <Link
            href={href}
            className={cn("inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-blue hover:underline", FOCUS_ON_LIGHT)}
          >
            Details <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
