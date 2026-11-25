"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Check, Package, RotateCcw, ShoppingBag, Truck } from "lucide-react";
import { BUSINESS_TIME_ZONE } from "@/lib/dashboard/home";
import { customerCanCancel, customerStatus, type FlowOrder } from "@/lib/products/orderFlow";
import { getPickupSettings } from "@/lib/products/storeSettings";
import { PickupPass } from "@/components/products/PickupPass";
import { CancelReservationButton } from "@/components/products/CancelReservationButton";
import { cn } from "@/lib/utils";
import type { ProductOrderItemRow, ProductOrderRow } from "@/types/db";

type OrderWithItems = ProductOrderRow & {
  product_order_items: ProductOrderItemRow[];
};

const LIGHT_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const ROW_ACTION = cn(
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper",
  LIGHT_FOCUS,
);
const PRIMARY_ACTION = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright",
  LIGHT_FOCUS,
);

const STORE_ADDRESS = "10410 S Main St";

const ref = (o: OrderWithItems) => o.id.slice(0, 8).toUpperCase();
const isOpen = (o: OrderWithItems) => o.fulfilment_status === "placed" || o.fulfilment_status === "ready";

/** A card checkout that was never paid (abandoned or expired) is noise to the customer. */
function isAbandonedCheckout(o: OrderWithItems): boolean {
  return (
    o.payment_method === "card" &&
    o.payment_status === "unpaid" &&
    (o.fulfilment_status === "placed" || o.fulfilment_status === "cancelled")
  );
}

/** One line under a past order's status. */
function closingLine(o: OrderWithItems): string {
  if (o.payment_status === "refunded") return "This order was refunded.";
  switch (o.fulfilment_status) {
    case "released":
      return "This reservation was released. Nothing was charged.";
    case "cancelled":
      return "This order was cancelled.";
    case "out_for_delivery":
      return "It's on its way to you.";
    default:
      return "Thanks for your order.";
  }
}

/** Three steps a customer recognises; null for orders off the normal path. */
function stepsFor(o: OrderWithItems): { label: string; done: boolean; current: boolean }[] | null {
  const delivery = o.fulfillment_method === "delivery";
  const at = { placed: 0, ready: 1, out_for_delivery: 1, completed: 2 }[o.fulfilment_status as string];
  if (at === undefined || o.payment_status === "refunded") return null;
  const labels = delivery ? ["Placed", "On the way", "Delivered"] : ["Placed", "Ready", "Picked up"];
  return labels.map((label, i) => ({ label, done: i <= at, current: i === at }));
}

function orderedOn(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  });
}

export default function OrdersPage() {
  const supabase = createClient();
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [pickupHours, setPickupHours] = useState<string | null>(null);
  const [pickupNote, setPickupNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    async function fetchOrders() {
      if (!user?.id) return;
      setLoading(true);
      setLoadError(false);
      const [{ data, error }, settings] = await Promise.all([
        supabase
          .from("product_orders")
          .select("*, product_order_items (*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        getPickupSettings(supabase),
      ]);
      if (error) {
        console.error(error);
        toast.error("Couldn't load your orders");
        setLoadError(true);
      }
      setOrders((data as OrderWithItems[]) ?? []);
      setPickupHours(settings.pickupHours);
      setPickupNote(settings.pickupNote);
      setLoading(false);
    }
    if (!authLoading) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, attempt]);

  const visible = orders.filter((o) => !isAbandonedCheckout(o));
  const open = visible.filter(isOpen);
  const past = visible.filter((o) => !isOpen(o));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Your orders</h1>
          <p className="mt-1 text-ink-muted">Car care products for pickup at {STORE_ADDRESS}.</p>
        </div>
        {!loading && !loadError && visible.length > 0 && (
          <Link href="/products" className={ROW_ACTION}>
            <ShoppingBag aria-hidden className="size-4 text-brand-blue" /> Shop car care
          </Link>
        )}
      </div>

      <div className="mt-6">
        {authLoading || loading ? (
          <div aria-busy="true" aria-label="Loading your orders" className="space-y-6">
            <div className="h-56 animate-pulse rounded-2xl bg-line motion-reduce:animate-none" />
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <AlertCircle aria-hidden className="size-5 shrink-0 text-destructive" />
              We couldn&apos;t load your orders.
            </p>
            <p className="mt-1 text-sm text-ink-muted">Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className={cn(ROW_ACTION, "mt-4 hover:bg-canvas")}
            >
              <RotateCcw aria-hidden className="size-4" /> Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7">
            <ShoppingBag aria-hidden className="size-8 text-ink-subtle" />
            <h2 className="mt-3 text-xl font-black tracking-tight text-ink">No orders yet</h2>
            <p className="mt-1 max-w-prose text-sm text-ink-muted">
              Products you buy from our shop show up here, so you can see when they&apos;re ready to collect.
            </p>
            <Link href="/products" className={cn(PRIMARY_ACTION, "mt-5")}>
              Shop car care <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {open.length > 0 && (
              <ul className="grid gap-6 lg:grid-cols-2">
                {open.map((order) => (
                  <li key={order.id}>
                    <PickupPass
                      order={{ ...(order as unknown as FlowOrder), id: order.id, items: order.product_order_items }}
                      pickupHours={pickupHours}
                      pickupNote={pickupNote}
                      action={
                        customerCanCancel(order as unknown as FlowOrder) ? (
                          <CancelReservationButton
                            orderId={order.id}
                            orderRef={ref(order)}
                            onCancelled={() => setAttempt((n) => n + 1)}
                          />
                        ) : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
            {past.length > 0 && (
              <section aria-labelledby="past-orders">
                {open.length > 0 && (
                  <h2 id="past-orders" className="mb-3 text-lg font-black tracking-tight text-ink">
                    Past orders
                  </h2>
                )}
                <ul aria-labelledby={open.length > 0 ? "past-orders" : undefined} className="grid gap-6 lg:grid-cols-2">
                  {past.map((order) => (
                    <li key={order.id}>
                      <OrderCard order={order} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const delivery = order.fulfillment_method === "delivery";
  const status = customerStatus(order as unknown as FlowOrder);
  const steps = stepsFor(order);
  const MethodIcon = delivery ? Truck : Package;

  return (
    <article
      aria-labelledby={`order-${order.id}`}
      className="flex h-full flex-col rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
    >
      <h2 id={`order-${order.id}`} className="text-xl font-black tracking-tight text-ink">
        Order {ref(order)}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        <span className="font-semibold text-ink">{status.label}</span> · {closingLine(order)}
      </p>

      {steps && (
        <ol aria-label="Order progress" className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {steps.map((step) => (
            <li
              key={step.label}
              aria-current={step.current ? "step" : undefined}
              className={cn("inline-flex items-center gap-1.5", step.done ? "font-semibold text-ink" : "text-ink-subtle")}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full ring-1",
                  step.done ? "bg-night text-on-night ring-night" : "ring-line",
                )}
              >
                {step.done && <Check aria-hidden className="size-3" strokeWidth={3} />}
              </span>
              {step.label}
              <span className="sr-only">{step.done ? " (done)" : " (not yet)"}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
        <MethodIcon aria-hidden className="size-4 shrink-0 text-ink-subtle" />
        <span>
          {delivery ? "Delivery" : `Pickup at ${STORE_ADDRESS}`}
          {" · "}Ordered {orderedOn(order.created_at)}
        </span>
      </p>

      <dl className="mt-4 divide-y divide-line-soft border-t border-line-soft text-sm">
        {order.product_order_items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 py-2">
            <dt className="text-ink">
              {item.name}
              {item.quantity > 1 && <span className="text-ink-muted"> × {item.quantity}</span>}
            </dt>
            <dd className="tabular-nums text-ink">${(item.unit_price * item.quantity).toFixed(2)}</dd>
          </div>
        ))}
        {order.delivery_fee > 0 && (
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-ink-muted">Delivery fee</dt>
            <dd className="tabular-nums text-ink">${order.delivery_fee.toFixed(2)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="font-semibold text-ink">Total</dt>
          <dd className="text-base font-black tabular-nums text-ink">${order.total.toFixed(2)}</dd>
        </div>
      </dl>
    </article>
  );
}
