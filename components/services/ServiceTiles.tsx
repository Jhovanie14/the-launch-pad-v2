import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ServicesPageModel } from "@/lib/marketing/servicesPage";
import { FLAME_BUTTON } from "@/components/booking/ui/focus";
import { ServiceTileGrid } from "./ServiceTileGrid";

/** The navy top of /services: the three service lines, with prices from real data. */
export default function ServiceTiles({ model }: { model: ServicesPageModel }) {
  return (
    <section aria-labelledby="services-title" className="bg-night text-on-night">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 id="services-title" className="text-5xl font-black leading-[0.95] tracking-[-0.035em] text-balance sm:text-6xl">
          Our services
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-on-night-muted">
          Self-service bays, express detailing and memberships, all at 10410 S Main St, Houston.
        </p>

        <ServiceTileGrid model={model} menuHref="#menu" className="mt-8" />

        <Link href="/service" className={cn(FLAME_BUTTON, "mt-8")}>
          Book a detail
        </Link>
      </div>
    </section>
  );
}
