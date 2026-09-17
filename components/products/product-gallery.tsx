"use client";

import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

/**
 * Portrait gallery for a product page.
 *
 * A single image renders as a plain still -- a carousel with one slide is just
 * controls that do nothing. Arrows only appear once there is somewhere to go.
 */
export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center border border-border/60 bg-card text-sm text-muted-foreground">
        No image
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className="relative aspect-[3/4] overflow-hidden border border-border/60">
        <Image
          src={images[0]}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {images.map((src, index) => (
          <CarouselItem key={src}>
            <div className="relative aspect-[3/4] overflow-hidden border border-border/60">
              <Image
                src={src}
                alt={index === 0 ? alt : `${alt} — view ${index + 1}`}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-4 rounded-none" />
      <CarouselNext className="right-4 rounded-none" />
    </Carousel>
  );
}
