import type { ReactNode } from "react";
import { Clock, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_ON_NIGHT } from "@/components/booking/ui/focus";
import {
  customerStatus,
  houstonDateLabel,
  isUnpaidReservation,
  type FlowOrder,
} from "@/lib/products/orderFlow";

const STORE_ADDRESS = "10410 S Main St, Houston";
const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=10410+S+Main+St,+Houston,+TX+77025";

export interface PassOrder extends FlowOrder {
  id: string;
  items: { name: string; quantity: number; unit_price: number }[];
}

const money = (n: number) => `$${Number(n).toFixed(2)}`;

/**
 * A store order as something to show at the counter: the member pass's object
 * language (Night, pass lift) with the short reference as the headline.
 * Used on the confirmation page and the orders page.
 */
export function PickupPass({
  order,
  pickupHours,
  action,
  headingLevel = "h2",
}: {
  order: PassOrder;
  pickupHours: string | null;
  /** Extra quiet controls after "Get directions" (e.g. cancel reservation). */
  action?: ReactNode;
  headingLevel?: "h1" | "h2";
}) {
  const ref = order.id.slice(0, 8).toUpperCase();
  const status = customerStatus(order);
  const unpaid = isUnpaidReservation(order);
  const open = order.fulfilment_status === "placed" || order.fulfilment_status === "ready";
  const Heading = headingLevel;
  const id = `pass-${order.id}`;

  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl bg-night p-5 text-on-night shadow-[0_18px_40px_-24px_rgb(8_20_52/0.9)] ring-1 ring-white/10 sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-on-night-muted">Store order</p>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            status.tone === "ready" ? "bg-flame text-on-flame" : "bg-white/12 text-on-night",
          )}
        >
          {status.label}
        </span>
      </div>

      <Heading id={id} className="mt-4 text-4xl leading-none font-black tracking-wide sm:text-5xl">
        <span className="sr-only">Order reference </span>
        {ref}
      </Heading>
      <p className="mt-2 text-sm text-on-night-subtle">Show this reference at the counter</p>

      {open && (
        <div className="mt-5 rounded-xl bg-white/6 p-4 text-sm leading-relaxed text-on-night-muted ring-1 ring-white/10">
          {unpaid ? (
            <>
              <span className="block text-xl font-black text-on-night">
                {money(order.total)} to pay at the counter
              </span>
              Cash, card or QR.{" "}
              {order.hold_until
                ? `Held until ${houstonDateLabel(order.hold_until)}.`
                : "We'll email you when it's ready."}
            </>
          ) : order.fulfilment_status === "ready" ? (
            <>
              <span className="block text-xl font-black text-on-night">Paid</span>
              Nothing to pay at pickup.
            </>
          ) : (
            <>
              <span className="block text-xl font-black text-on-night">Paid</span>
              We&apos;ll email you when it&apos;s ready.
            </>
          )}
        </div>
      )}

      <ul className="mt-5 divide-y divide-white/10 border-y border-white/10 text-sm">
        {order.items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex justify-between gap-4 py-2.5">
            <span className="text-on-night">
              {item.name} <span className="text-on-night-subtle">× {item.quantity}</span>
            </span>
            <span className="whitespace-nowrap text-on-night-muted">{money(item.unit_price * item.quantity)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-4 py-2.5 font-semibold text-on-night">
          <span>Total</span>
          <span>{money(order.total)}</span>
        </li>
      </ul>

      <div className="mt-4 space-y-2 text-sm text-on-night-muted">
        {pickupHours && (
          <p className="flex gap-2.5">
            <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>Pickup hours: {pickupHours}</span>
          </p>
        )}
        <p className="flex gap-2.5">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{STORE_ADDRESS}</span>
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={DIRECTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-on-night ring-1 ring-white/25 transition-colors hover:bg-white/10 motion-reduce:transition-none",
            FOCUS_ON_NIGHT,
          )}
        >
          <Navigation aria-hidden className="size-4" />
          Get directions
        </a>
        {action}
      </div>
    </section>
  );
}
