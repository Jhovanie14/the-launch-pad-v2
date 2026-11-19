import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServicesPageModel } from "@/lib/marketing/servicesPage";
import { FOCUS_ON_NIGHT } from "@/components/booking/ui/focus";
import { ServiceTileGrid } from "@/components/services/ServiceTileGrid";
import { BookDetailButton } from "./BookDetailButton";

const FACTS = [
  { icon: Clock, text: "Bays open 24/7" },
  { icon: Sparkles, text: "Detailing Thu–Sun, 9:30 AM–6:30 PM" },
  { icon: MapPin, text: "10410 S Main St" },
];

/** The home page's navy hero: the promise, one flame action, and the three service lines with live prices. */
export function HomeHero({ model }: { model: ServicesPageModel }) {
  return (
    <section aria-labelledby="home-title" className="relative isolate min-h-svh w-full overflow-hidden bg-night text-on-night">
      {/* A real image element, so it is the sized, priority LCP candidate. */}
      <Image src="/self-service.png" alt="" fill priority sizes="100vw" className="-z-10 object-cover object-center" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-night/70 via-night/65 to-night/90" />

      <div className="mx-auto w-full max-w-7xl px-5 pt-24 pb-20 sm:px-8 md:pt-32 md:pb-24">
        <h1
          id="home-title"
          className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.035em] text-balance sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Your car deserves better.
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-pretty text-on-night-muted md:text-xl">
          24/7 self-service bays or a full professional detail, everything your car needs at{" "}
          <span className="font-semibold text-on-night">10410 S Main St, Houston.</span>
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <BookDetailButton />
          <Link
            href="/self-service"
            className={cn(
              "inline-flex h-13 items-center justify-center rounded-lg px-7 text-base font-bold text-on-night ring-1 ring-paper/25 transition-colors hover:bg-paper/10 motion-reduce:transition-none",
              FOCUS_ON_NIGHT,
            )}
          >
            Self-service bays
          </Link>
        </div>

        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-on-night-muted">
          {FACTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Icon aria-hidden className="size-4 text-on-night-subtle" />
              {text}
            </li>
          ))}
        </ul>

        <ServiceTileGrid model={model} menuHref="/services#menu" className="mt-16 md:mt-20" />
      </div>
    </section>
  );
}
