"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, Truck } from "lucide-react";
import { orderStatusLabel } from "@/lib/products/orderStatus";
import type { ProductOrderItemRow, ProductOrderRow } from "@/types/db";

type OrderWithItems = ProductOrderRow & {
  product_order_items: ProductOrderItemRow[];
};

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-blue-100 text-blue-800",
  ready_for_pickup: "bg-green-100 text-green-800",
  out_for_delivery: "bg-amber-100 text-amber-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-gray-100 text-gray-500",
  refunded: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-500",
};

export default function OrdersPage() {
  const supabase = createClient();
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("product_orders")
        .select("*, product_order_items (*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast.error("Failed to load your orders");
      }
      setOrders((data as OrderWithItems[]) ?? []);
      setLoading(false);
    }
    if (!authLoading) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </div>
    );
  }

  // Hide never-paid checkouts; they're noise to the customer.
  const visible = orders.filter(
    (o) => o.status !== "pending" && o.status !== "cancelled",
  );

  if (visible.length === 0) {
    return (
      <div className="py-24 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">No orders yet</h1>
        <p className="mb-6 text-muted-foreground">
          Products you buy will show up here with their status.
        </p>
        <Link href="/products">
          <Button className="bg-blue-900 hover:bg-blue-800">Shop products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your orders</h1>
      {visible.map((order) => (
        <Card key={order.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {order.fulfillment_method === "delivery" ? (
                  <Truck className="h-4 w-4" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                {order.fulfillment_method === "delivery" ? "Delivery" : "Pickup"}
                <span className="font-normal text-muted-foreground">
                  · {new Date(order.created_at).toLocaleDateString()}
                </span>
              </CardTitle>
              <Badge className={STATUS_STYLES[order.status] ?? ""}>
                {orderStatusLabel(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {order.product_order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name}{" "}
                  <span className="text-muted-foreground">×{item.quantity}</span>
                </span>
                <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>${order.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-sm font-bold">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
