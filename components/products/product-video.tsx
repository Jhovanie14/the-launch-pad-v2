"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface ProductVideoProps {
  /** Landscape clip. Null falls back to the poster image alone. */
  src: string | null;
  /** Always supply one: it is what renders first and what reduced motion gets. */
  poster: string | null;
  alt: string;
  /** Aspect ratio and rounding come from the caller. */
  className?: string;
  /** Set on the hero only — it is the LCP element. */
  priority?: boolean;
  sizes?: string;
}

/**
 * A muted, looping clip that only plays while it is on screen.
 *
 * The poster image is a real <Image>, not the video's `poster` attribute, so it
 * is optimised and can be marked priority for LCP. The video sits above it at
 * opacity 0 and crossfades in once it can actually play, which means a slow
 * connection shows a sharp still rather than a black box.
 *
 * Playback is gated on IntersectionObserver with `preload="none"`, so nothing
 * downloads until a clip is close to view. Concurrency stays naturally bounded
 * because the only places this renders large are the hero and the featured
 * panels, which are a viewport tall -- the product grid is stills only.
 *
 * Visitors who asked for reduced motion get the still and no video element at
 * all; MotionConfig cannot help here because this is a raw <video>.
 */
export function ProductVideo({
  src,
  poster,
  alt,
  className = "",
  priority = false,
  sizes = "100vw",
}: ProductVideoProps) {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  const showVideo = Boolean(src) && !reduceMotion;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // play() rejects if the browser blocks autoplay; the poster stays up,
          // which is a fine outcome, so the rejection is deliberately ignored.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [showVideo]);

  return (
    // cn(), not a template string: callers legitimately pass `absolute` (the
    // hero fills its section), and plain concatenation leaves both position
    // utilities in the class list with the stylesheet deciding the winner.
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      {poster && (
        <Image
          src={poster}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      )}

      {showVideo && (
        <video
          ref={videoRef}
          src={src ?? undefined}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          onCanPlay={() => setReady(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
