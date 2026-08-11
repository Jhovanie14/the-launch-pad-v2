"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Package, Truck } from "lucide-react";
import { nextActionFor, orderStatusLabel } from "@/lib/products/orderStatus";
import type { ProductOrderItemRow, ProductOrderRow } from "@/types/db";

type OrderWithItems = ProductOrderRow & {
  product_order_items: ProductOrderItemRow[];
};
type CustomerInfo = { email: string | null; full_name: string | null };

const NEEDS_ACTION = ["paid", "ready_for_pickup", "out_for_delivery"];

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-blue-100 text-blue-800",
  ready_for_pickup: "bg-green-100 text-green-800",
  out_for_delivery: "bg-amber-100 text-amber-800",
  completed: "bg-gray-100 text-gray-800",
  refunded: "bg-red-100 text-red-800",
};

/** delivery_address is the Stripe shipping_details JSON. */
function formatAddress(raw: unknown): string | null {
  const details = raw as {
    name?: string;
    address?: {
      line1?: string;
      line2?: string | null;
      city?: string;
      state?: string;
      postal_code?: string;
    };
  } | null;
  if (!details?.address) return null;
  const a = details.address;
  const parts = [
    details.name,
    a.line1,
    a.line2,
    [a.city, a.state, a.postal_code].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts.join(", ");
}

export default function OrdersView() {
  const supabase = createClient();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [customers, setCustomers] = useState<Record<string, CustomerInfo>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("needs_action");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<OrderWithItems | null>(null);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("product_orders")
      .select("*, product_order_items (*)")
      .neq("status", "pending")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Failed to load orders");
      setLoading(false);
      return;
    }
    const rows = (data as OrderWithItems[]) ?? [];
    setOrders(rows);

    const userIds = [...new Set(rows.map((o) => o.user_id))];
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      const map: Record<string, CustomerInfo> = {};
      for (const p of profiles ?? []) {
        map[p.id] = { email: p.email, full_name: p.full_name };
      }
      setCustomers(map);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const callApi = async (path: string, body: object, orderId: string) => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success("Order updated");
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
    } finally {
      setBusyOrderId(null);
    }
  };

  const filtered = orders.filter((o) =>
    statusFilter === "needs_action"
      ? NEEDS_ACTION.includes(o.status)
      : statusFilter === "all"
        ? true
        : o.status === statusFilter,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Product orders</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="needs_action">Needs action</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="ready_for_pickup">Ready for pickup</SelectItem>
            <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {statusFilter === "needs_action"
            ? "No orders need action right now."
            : "No orders match this filter."}
        </p>
      ) : (
        filtered.map((order) => {
          const customer = customers[order.user_id];
          const action = nextActionFor(order);
          const address = formatAddress(order.delivery_address);
          const busy = busyOrderId === order.id;
          const canRefund = NEEDS_ACTION.includes(order.status);
          return (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {order.fulfillment_method === "delivery" ? (
                      <Truck className="h-4 w-4" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    {order.fulfillment_method === "delivery"
                      ? "Delivery"
                      : "Pickup"}
                    <span className="font-normal text-muted-foreground">
                      · {new Date(order.created_at).toLocaleString()}
                    </span>
                  </CardTitle>
                  <Badge className={STATUS_STYLES[order.status] ?? ""}>
                    {orderStatusLabel(order.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium">
                    {customer?.full_name ?? "Unknown customer"}
                  </p>
                  <p className="text-muted-foreground">
                    {customer?.email ?? "no email"}
                    {order.phone ? ` · ${order.phone}` : ""}
                  </p>
                  {order.fulfillment_method === "delivery" && (
                    <p className="mt-1 font-medium text-amber-700">
                      {address ?? "No address on file"}
                    </p>
                  )}
                </div>

                <div className="space-y-1 rounded-md bg-muted/40 p-3">
                  {order.product_order_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.name}{" "}
                        <span className="text-muted-foreground">
                          ×{item.quantity}
                        </span>
                      </span>
                      <span>
                        ${(item.unit_price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {order.delivery_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery fee</span>
                      <span>${order.delivery_fee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 text-sm font-bold">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {action && (
                    <Button
                      className="bg-blue-900 hover:bg-blue-800"
                      disabled={busy}
                      onClick={() =>
                        callApi(
                          "/api/admin/product-orders/update-status",
                          { order_id: order.id, to_status: action.to },
                          order.id,
                        )
                      }
                    >
                      {busy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {action.label}
                    </Button>
                  )}
                  {canRefund && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setRefundTarget(order)}
                    >
                      Refund
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <AlertDialog
        open={refundTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRefundTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This refunds ${refundTarget?.total.toFixed(2)} to the customer
              through Stripe and marks the order refunded. Stock is not
              restocked automatically — adjust it on the Products page if the
              items come back to the shelf.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (refundTarget) {
                  callApi(
                    "/api/admin/product-orders/refund",
                    { order_id: refundTarget.id },
                    refundTarget.id,
                  );
                }
                setRefundTarget(null);
              }}
            >
              Refund order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
