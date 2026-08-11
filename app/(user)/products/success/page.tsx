import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, Package, Truck } from "lucide-react";
import { stripe } from "@/lib/stripe/stripe";
import { createAdminClient } from "@/utils/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orderStatusLabel } from "@/lib/products/orderStatus";
import ClearCart from "./clear-cart";

interface ProductSuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ProductSuccessPage({
  searchParams,
}: ProductSuccessPageProps) {
  const { session_id } = await searchParams;
  if (!session_id) return redirect("/products");

  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (session.status === "open") return redirect("/products/cart");
  if (session.metadata?.payment_type !== "product_order") {
    return redirect("/products");
  }

  const orderId = session.metadata.order_id;
  const supabase = createAdminClient();

  // Give the webhook a few seconds to flip pending -> paid.
  let order: {
    id: string;
    status: string;
    fulfillment_method: string;
    subtotal: number;
    delivery_fee: number;
    total: number;
  } | null = null;
  const timeout = Date.now() + 10000;
  while (Date.now() < timeout) {
    const { data } = await supabase
      .from("product_orders")
      .select("id, status, fulfillment_method, subtotal, delivery_fee, total")
      .eq("id", orderId)
      .maybeSingle();
    if (data && data.status !== "pending") {
      order = data;
      break;
    }
    if (data && !order) order = data; // keep the pending row as fallback
    await new Promise((res) => setTimeout(res, 1000));
  }

  const { data: items } = await supabase
    .from("product_order_items")
    .select("id, name, unit_price, quantity")
    .eq("order_id", orderId);

  const isDelivery = order?.fulfillment_method === "delivery";

  return (
    <main className="container mx-auto flex-1 px-4 py-16">
      <ClearCart />
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
        <h1 className="text-3xl font-bold">Thanks for your order!</h1>
        <p className="text-muted-foreground">
          {order && order.status === "pending"
            ? "Your payment is being confirmed — you'll get an email receipt shortly."
            : "Payment confirmed. A confirmation email is on its way."}
        </p>

        <Card className="text-left">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {isDelivery ? (
                <>
                  <Truck className="h-5 w-5" /> Delivery
                </>
              ) : (
                <>
                  <Package className="h-5 w-5" /> Pickup at 10410 S Main St,
                  Houston, TX 77025
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(items ?? []).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name}{" "}
                  <span className="text-muted-foreground">×{item.quantity}</span>
                </span>
                <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {order && (
              <>
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery fee</span>
                    <span>${order.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">
                  Status: {orderStatusLabel(order.status)} · Order ID: {order.id}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center gap-3">
          <Link href="/dashboard/orders">
            <Button className="bg-blue-900 hover:bg-blue-800">
              View my orders
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline">Keep shopping</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
