"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Package,
  RotateCcw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { BUSINESS_TIME_ZONE } from "@/lib/dashboard/home";
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

/** What the order status means to the customer, for pickup or delivery. */
function describe(order: OrderWithItems): { title: string; line: string } {
  const delivery = order.fulfillment_method === "delivery";
  switch (order.status) {
    case "paid":
      return delivery
        ? { title: "Getting your order ready", line: "We'll email you when it's out for delivery." }
        : { title: "Getting your order ready", line: "We'll email you when it's ready to collect." };
    case "ready_for_pickup":
      return { title: "Ready for pickup", line: `Collect it at ${STORE_ADDRESS}.` };
    case "out_for_delivery":
      return { title: "Out for delivery", line: "It's on its way to you." };
    case "completed":
      return delivery
        ? { title: "Delivered", line: "Thanks for your order." }
        : { title: "Picked up", line: "Thanks for your order." };
    case "refunded":
      return { title: "Refunded", line: "This order was refunded to your original payment method." };
    default:
      return { title: order.status.replace(/_/g, " "), line: "" };
  }
}

/** Three steps a customer recognises; null for orders off the normal path. */
function stepsFor(order: OrderWithItems): { label: string; done: boolean; current: boolean }[] | null {
  const delivery = order.fulfillment_method === "delivery";
  const order_ = ["paid", delivery ? "out_for_delivery" : "ready_for_pickup", "completed"];
  const at = order_.indexOf(order.status);
  if (at === -1) return null;
  const labels = ["Ordered", delivery ? "On the way" : "Ready to collect", delivery ? "Delivered" : "Picked up"];
  return labels.map((label, i) => ({ label, done: i <= at, current: i === at }));
}

/** delivery_address is the Stripe shipping_details JSON. */
function formatAddress(raw: unknown): string | null {
  const details = raw as {
    address?: { line1?: string; line2?: string | null; city?: string; state?: string; postal_code?: string };
  } | null;
  if (!details?.address) return null;
  const a = details.address;
  return [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    async function fetchOrders() {
      if (!user?.id) return;
      setLoading(true);
      setLoadError(false);
      const { data, error } = await supabase
        .from("product_orders")
        .select("*, product_order_items (*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast.error("Couldn't load your orders");
        setLoadError(true);
      }
      setOrders((data as OrderWithItems[]) ?? []);
      setLoading(false);
    }
    if (!authLoading) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, attempt]);

  // Hide never-paid checkouts; they're noise to the customer.
  const visible = orders.filter(
    (o) => o.status !== "pending" && o.status !== "cancelled",
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Your orders</h1>
          <p className="mt-1 text-ink-muted">
            Car care products for pickup at {STORE_ADDRESS} or local delivery.
          </p>
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
              Products you buy from our shop show up here, so you can see when
              they&apos;re ready to collect or on their way.
            </p>
            <Link href="/products" className={cn(PRIMARY_ACTION, "mt-5")}>
              Shop car care <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        ) : (
          <ul className="grid gap-6 lg:grid-cols-2">
            {visible.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const delivery = order.fulfillment_method === "delivery";
  const { title, line } = describe(order);
  const steps = stepsFor(order);
  const address = delivery ? formatAddress(order.delivery_address) : null;
  const MethodIcon = delivery ? Truck : Package;

  return (
    <article
      aria-labelledby={`order-${order.id}`}
      className="flex h-full flex-col rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
    >
      <h2 id={`order-${order.id}`} className="text-xl font-black tracking-tight text-ink first-letter:uppercase">
        {title}
      </h2>
      {line && <p className="mt-1 text-sm text-ink-muted">{line}</p>}

      {steps && (
        <ol aria-label="Order progress" className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {steps.map((step) => (
            <li
              key={step.label}
              aria-current={step.current ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5",
                step.done ? "font-semibold text-ink" : "text-ink-subtle",
              )}
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
          {address && <> to {address}</>}
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

      <p className="mt-auto pt-3 text-xs text-ink-subtle">
        Order {order.id.slice(0, 8).toUpperCase()}
      </p>
    </article>
  );
}
