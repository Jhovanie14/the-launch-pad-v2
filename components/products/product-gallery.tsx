"use client";

import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { SURFACE } from "@/components/booking/ui/focus";
import { ProductVideo } from "./product-video";

const FRAME = "relative aspect-square overflow-hidden rounded-xl bg-paper";

/**
 * The product page's pictures on white: packshots contained (never cropped),
 * the clip first when there is one. A single picture is a plain still; arrows
 * only appear once there is somewhere to go.
 */
export function ProductGallery({
  images,
  alt,
  video,
}: {
  images: string[];
  alt: string;
  video?: { src: string; poster: string | null } | null;
}) {
  const slides: ({ kind: "video" } | { kind: "image"; src: string; index: number })[] = [
    ...(video ? [{ kind: "video" as const }] : []),
    ...images.map((src, index) => ({ kind: "image" as const, src, index })),
  ];

  const render = (slide: (typeof slides)[number], first: boolean) =>
    slide.kind === "video" ? (
      <div className={cn(FRAME, "bg-night")}>
        <ProductVideo src={video!.src} poster={video!.poster} alt={alt} priority={first} sizes="(min-width: 1024px) 45vw, 100vw" className="absolute inset-0 h-full w-full" />
      </div>
    ) : (
      <div className={FRAME}>
        <Image
          src={slide.src}
          alt={slide.index === 0 ? alt : `${alt}, view ${slide.index + 1}`}
          fill
          priority={first}
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-contain p-4 sm:p-6"
        />
      </div>
    );

  return (
    <div className={cn(SURFACE, "p-3 sm:p-4")}>
      {slides.length === 0 ? (
        <div className={cn(FRAME, "bg-line-soft")} />
      ) : slides.length === 1 ? (
        render(slides[0], true)
      ) : (
        <Carousel className="w-full" opts={{ loop: false }}>
          <CarouselContent>
            {slides.map((slide, i) => (
              <CarouselItem key={slide.kind === "video" ? "video" : slide.src}>{render(slide, i === 0)}</CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-3 size-11" />
          <CarouselNext className="right-3 size-11" />
        </Carousel>
      )}
    </div>
  );
}
