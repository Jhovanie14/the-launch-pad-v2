import { ExternalLink, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_ON_NIGHT } from "@/components/booking/ui/focus";
import { customerStatus } from "@/lib/products/orderFlow";
import type { PassOrder } from "./PickupPass";

export interface ShippingPassOrder extends PassOrder {
  delivery_fee: number;
  delivery_address: unknown;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipping_service?: string | null;
}

const money = (n: number) => `$${Number(n).toFixed(2)}`;

function addressLines(a: unknown): string[] {
  if (!a || typeof a !== "object") return [];
  const o = a as Record<string, string | undefined>;
  return [o.name, [o.street1, o.street2].filter(Boolean).join(", "), `${o.city ?? ""}, ${o.state ?? ""} ${o.zip ?? ""}`.trim()].filter(
    (l): l is string => Boolean(l && l.replace(/[,\s]/g, "")),
  );
}

/**
 * A shipping order, in the pickup pass's object language (Night, pass lift):
 * the reference, what's in it, where it's going, and tracking once shipped.
 */
export function ShippingPass({ order, headingLevel = "h2" }: { order: ShippingPassOrder; headingLevel?: "h1" | "h2" }) {
  const ref = order.id.slice(0, 8).toUpperCase();
  const status = customerStatus(order);
  const shipped = order.fulfilment_status === "out_for_delivery";
  const Heading = headingLevel;
  const id = `ship-${order.id}`;
  const lines = addressLines(order.delivery_address);

  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl bg-night p-5 text-on-night shadow-[0_18px_40px_-24px_rgb(8_20_52/0.9)] ring-1 ring-white/10 sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-on-night-muted">Shipping order</p>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", shipped ? "bg-flame text-on-flame" : "bg-white/12 text-on-night")}>
          {status.label}
        </span>
      </div>

      <Heading id={id} className="mt-4 text-4xl leading-none font-black tracking-wide sm:text-5xl">
        <span className="sr-only">Order reference </span>
        {ref}
      </Heading>

      <ul className="mt-5 divide-y divide-white/10 border-y border-white/10 text-sm">
        {order.items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex justify-between gap-4 py-2.5">
            <span className="text-on-night">
              {item.name} <span className="text-on-night-subtle">× {item.quantity}</span>
            </span>
            <span className="whitespace-nowrap text-on-night-muted">{money(item.unit_price * item.quantity)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-4 py-2.5 text-on-night-muted">
          <span>Shipping{order.shipping_service ? ` (${order.shipping_service})` : ""}</span>
          <span className="whitespace-nowrap">{money(order.delivery_fee)}</span>
        </li>
        <li className="flex justify-between gap-4 py-2.5 font-semibold text-on-night">
          <span>Total</span>
          <span>{money(order.total)}</span>
        </li>
      </ul>

      {lines.length > 0 && (
        <div className="mt-4 flex gap-2.5 text-sm text-on-night-muted">
          <Truck aria-hidden className="mt-0.5 size-4 shrink-0" />
          <address className="not-italic">
            {lines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </address>
        </div>
      )}

      {shipped && order.tracking_url ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={order.tracking_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-on-night ring-1 ring-white/25 transition-colors hover:bg-white/10 motion-reduce:transition-none",
              FOCUS_ON_NIGHT,
            )}
          >
            Track package
            <ExternalLink aria-hidden className="size-4" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          {order.tracking_number && <span className="text-sm text-on-night-subtle">{order.tracking_number}</span>}
        </div>
      ) : order.fulfilment_status === "placed" && order.payment_status === "paid" ? (
        <p className="mt-4 text-sm text-on-night-subtle">{"We'll email tracking when it ships."}</p>
      ) : null}
    </section>
  );
}
