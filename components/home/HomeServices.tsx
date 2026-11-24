import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT, SURFACE } from "@/components/booking/ui/focus";
import { HOME_SERVICES, type HomeService } from "@/lib/marketing/homePage";

// The service legend's -mark shades: they hold 3:1 on white.
const MARK: Record<HomeService["key"], string> = {
  self: "bg-svc-self-mark",
  detail: "bg-svc-detail-mark",
  member: "bg-svc-member-mark",
};

/** "Three services, one location": real shop photos on Canvas, no prices. */
export function HomeServices() {
  return (
    <section aria-labelledby="services-title" className="bg-canvas py-16 text-ink md:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <h2 id="services-title" className="text-4xl font-black leading-[1.05] tracking-[-0.025em] text-balance md:text-5xl">
          Three services, one location
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
          From washing it yourself to a full professional detail, it&apos;s all at 10410 S Main St.
        </p>
        <ul className="mt-12 grid gap-6 md:mt-14 md:grid-cols-3">
          {HOME_SERVICES.map((service) => (
            <li key={service.key} className={cn(SURFACE, "flex flex-col overflow-hidden")}>
              <div className="relative aspect-4/3 w-full">
                <Image
                  src={service.photo.src}
                  alt={service.photo.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="flex items-center gap-2 text-xl font-black tracking-[-0.015em]">
                  <span aria-hidden className={cn("size-2.5 rounded-full", MARK[service.key])} />
                  {service.name}
                </h3>
                <p className="mt-2 leading-relaxed text-ink-muted">{service.lede}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  {service.facts.map((fact) => (
                    <li key={fact} className="flex items-start gap-2.5">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-blue" />
                      {fact}
                    </li>
                  ))}
                </ul>
                <Link
                  href={service.link.href}
                  className={cn(
                    "mt-6 inline-flex h-11 items-center self-start rounded-lg px-4 text-sm font-bold text-ink ring-1 ring-line transition-colors hover:bg-canvas motion-reduce:transition-none",
                    FOCUS_ON_LIGHT,
                  )}
                >
                  {service.link.label}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
