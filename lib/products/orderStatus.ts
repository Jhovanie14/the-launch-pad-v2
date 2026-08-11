// Product-order status machine.
// pending -> paid -> ready_for_pickup | out_for_delivery -> completed
// Side states: cancelled (checkout expired), refunded (staff action).

export const PRODUCT_ORDER_STATUSES = [
  "pending",
  "paid",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
  "refunded",
] as const;

export type ProductOrderStatus = (typeof PRODUCT_ORDER_STATUSES)[number];

const LABELS: Record<ProductOrderStatus, string> = {
  pending: "Pending payment",
  paid: "Paid",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function orderStatusLabel(status: string): string {
  return LABELS[status as ProductOrderStatus] ?? status;
}

export function canTransition(
  from: string,
  to: string,
  method: "pickup" | "delivery",
): boolean {
  switch (from) {
    case "pending":
      return to === "paid" || to === "cancelled";
    case "paid":
      if (to === "refunded") return true;
      if (to === "ready_for_pickup") return method === "pickup";
      if (to === "out_for_delivery") return method === "delivery";
      return false;
    case "ready_for_pickup":
    case "out_for_delivery":
      return to === "completed" || to === "refunded";
    default:
      return false; // completed, cancelled, refunded are terminal
  }
}

export function nextActionFor(order: {
  status: string;
  fulfillment_method: string;
}): { to: ProductOrderStatus; label: string } | null {
  if (order.status === "paid") {
    return order.fulfillment_method === "delivery"
      ? { to: "out_for_delivery", label: "Mark out for delivery" }
      : { to: "ready_for_pickup", label: "Mark ready for pickup" };
  }
  if (order.status === "ready_for_pickup" || order.status === "out_for_delivery") {
    return { to: "completed", label: "Mark completed" };
  }
  return null;
}
