import Link from "next/link";
import { Check, Minus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuCategory, ServicesPageModel } from "@/lib/marketing/servicesPage";
import { RING_BUTTON } from "@/components/booking/ui/focus";

const money = (n: number) => `$${n.toFixed(2)}`;

const durationRange = (c: MenuCategory) =>
  c.minDuration === c.maxDuration ? `${c.minDuration} min` : `${c.minDuration} to ${c.maxDuration} min`;

/** The detailing menu on /services: real packages and prices, one "Book this" each. */
export default function ServiceMenu({ model }: { model: ServicesPageModel }) {
  return (
    <section id="menu" aria-label="Detailing menu" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-10 sm:px-8 sm:py-14">
      {model.sale.active && model.categories.length > 0 && (
        <p className="mb-8 flex items-center gap-2 text-base font-semibold text-ink-muted">
          <Tag className="size-5 shrink-0 text-svc-detail-mark" aria-hidden />
          Holiday sale: {model.sale.percent}% off all services. Prices shown include it.
        </p>
      )}

      {model.categories.length === 0 ? (
        <p className="rounded-2xl bg-paper p-6 text-base text-ink-muted ring-1 ring-line">
          No services are listed right now. Please call{" "}
          <a href="tel:8322198320" className="font-semibold text-brand-blue underline underline-offset-4">
            (832) 219-8320
          </a>{" "}
          and we&apos;ll get you booked.
        </p>
      ) : (
        <div className="space-y-12">
          {model.categories.map((category) => (
            <section key={category.key} aria-labelledby={`cat-${category.key}`}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 id={`cat-${category.key}`} className="text-2xl font-black tracking-[-0.025em] sm:text-3xl">
                  {category.label}
                </h2>
                <span className="text-base text-ink-muted">{durationRange(category)}</span>
              </div>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col rounded-2xl bg-paper p-5 ring-1 ring-line motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
                  >
                    <h3 className="text-lg font-black leading-tight tracking-[-0.02em]">{item.name}</h3>
                    <p className="mt-0.5 text-sm text-ink-muted">{item.duration} min</p>
                    <ul className="mt-4 flex-1 space-y-1.5">
                      {item.features.map((f, i) => {
                        const missing = /^no\b/i.test(f.trim());
                        return (
                          <li key={i} className={cn("flex items-start gap-2 text-sm", missing ? "text-ink-subtle" : "text-ink-muted")}>
                            {missing ? (
                              <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />
                            ) : (
                              <Check className="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden />
                            )}
                            <span>{f}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <p>
                        <span className="text-2xl font-black tracking-[-0.025em]">{money(item.salePrice ?? item.price)}</span>
                        {item.salePrice !== null && (
                          <s className="ml-2 text-sm text-ink-muted">
                            <span className="sr-only">was </span>
                            {money(item.price)}
                          </s>
                        )}
                      </p>
                      <Link href={`/service?service=${item.id}`} className={RING_BUTTON} aria-label={`Book ${item.name}`}>
                        Book this
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-base text-ink-muted">
            Extras like interior shampoo, pet hair removal and rim shine can be added when you book.
          </p>
        </div>
      )}
    </section>
  );
}
