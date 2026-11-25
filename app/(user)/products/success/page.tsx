import Link from "next/link";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { cn } from "@/lib/utils";
import { FLAME_BUTTON, GHOST_BUTTON } from "@/components/booking/ui/focus";
import { PickupPass, type PassOrder } from "@/components/products/PickupPass";
import { ShippingPass, type ShippingPassOrder } from "@/components/products/ShippingPass";
import { CancelReservationButton } from "@/components/products/CancelReservationButton";
import { customerCanCancel, successHeading } from "@/lib/products/orderFlow";
import { getPickupSettings } from "@/lib/products/storeSettings";
import ClearCart from "./clear-cart";
import TrackPurchase from "./track-purchase";
import ConfirmingPayment from "./ConfirmingPayment";

interface ProductSuccessPageProps {
  searchParams: Promise<{ session_id?: string; order?: string }>;
}

type OrderRow = Omit<PassOrder, "items"> & {
  product_order_items: PassOrder["items"];
};

/**
 * After checkout: a card payment returns here with ?session_id=, a reservation
 * with ?order=. Either way the order is read as the signed-in customer, so RLS
 * only ever shows them their own order.
 */
export default async function ProductSuccessPage({ searchParams }: ProductSuccessPageProps) {
  const { session_id, order: orderParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/dashboard/orders");

  let orderId = orderParam ?? null;
  if (!orderId && session_id) {
    const session = await stripe.checkout.sessions.retrieve(session_id).catch(() => null);
    if (!session || session.metadata?.payment_type !== "product_order") return redirect("/dashboard/orders");
    if (session.status === "open") return redirect("/products/cart");
    orderId = session.metadata.order_id ?? null;
  }
  if (!orderId) return redirect("/products");

  const [{ data }, settings] = await Promise.all([
    supabase
      .from("product_orders")
      .select(
        "id, total, payment_method, payment_status, fulfilment_status, fulfillment_method, hold_until, delivery_fee, delivery_address, tracking_number, tracking_url, shipping_service, product_order_items (name, quantity, unit_price)",
      )
      .eq("id", orderId)
      .maybeSingle(),
    getPickupSettings(supabase),
  ]);
  if (!data) return redirect("/dashboard/orders");

  const row = data as unknown as OrderRow;
  const order: PassOrder = { ...row, items: row.product_order_items ?? [] };
  const ref = order.id.slice(0, 8).toUpperCase();
  const waitingForCard =
    order.payment_method === "card" && order.payment_status === "unpaid" && order.fulfilment_status === "placed";

  return (
    <main className="lp-theme flex-1 bg-canvas px-4 py-10 text-ink sm:py-16">
      <ClearCart />
      {order.payment_method === "card" && order.payment_status === "paid" && (
        <TrackPurchase orderId={order.id} total={order.total} items={order.items} />
      )}

      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-black tracking-tight text-balance">
          {successHeading(order)}
        </h1>

        <div className="mt-6">
          {waitingForCard ? (
            <ConfirmingPayment />
          ) : order.fulfillment_method === "delivery" ? (
            <ShippingPass order={order as ShippingPassOrder} />
          ) : (
            <PickupPass
              order={order}
              pickupHours={settings.pickupHours}
              pickupNote={settings.pickupNote}
              action={customerCanCancel(order) ? <CancelReservationButton orderId={order.id} orderRef={ref} /> : undefined}
            />
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/orders" className={FLAME_BUTTON}>
            Track my orders
          </Link>
          <Link href="/products" className={cn(GHOST_BUTTON)}>
            Keep shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
