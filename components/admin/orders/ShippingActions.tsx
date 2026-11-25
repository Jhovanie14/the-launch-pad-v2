"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT, RING_BUTTON } from "@/components/booking/ui/focus";
import { staffActionsFor, type FlowOrder, type StaffAction } from "@/lib/products/orderFlow";

const PRIMARY = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-night px-4 text-sm font-bold text-on-night transition-colors hover:bg-dusk disabled:opacity-60 motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);
const QUIET = cn(
  "inline-flex h-11 items-center rounded-lg px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-line-soft hover:text-ink motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);

export interface ShippingOrder {
  id: string;
  payment_status: string;
  fulfilment_status: string;
  shippo_order_id: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
}

/**
 * The buttons on a shipping order: buy the label in Shippo (or send the order
 * there first), and the manual fallbacks for when Shippo's update never comes.
 */
export function ShippingActions({
  order,
  busy,
  onAction,
  onShippo,
  onRefund,
}: {
  order: ShippingOrder;
  busy: boolean;
  onAction: (action: StaffAction, extra?: object) => Promise<boolean> | void;
  onShippo: (action: "push" | "check") => void;
  onRefund: () => void;
}) {
  const [shipping, setShipping] = useState(false);
  const [tracking, setTracking] = useState("");
  const actions = staffActionsFor(order as unknown as FlowOrder);
  const paid = order.payment_status === "paid";

  if (shipping) {
    return (
      <form
        className="mt-4 rounded-xl bg-canvas p-4 ring-1 ring-line"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await onAction("mark_shipped", { tracking_number: tracking });
          if (ok !== false) setShipping(false);
        }}
      >
        <label className="block">
          <span className="text-sm font-bold">Tracking number</span>
          <span className="block text-sm text-ink-muted">Only if the label was bought outside Shippo&apos;s order, or Shippo never updated us.</span>
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            maxLength={64}
            autoFocus
            required
            className={cn("mt-2 h-11 w-full rounded-lg bg-paper px-3 text-base ring-1 ring-line", FOCUS_ON_LIGHT)}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" className={PRIMARY} disabled={busy || !tracking.trim()}>
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Mark shipped
          </button>
          <button type="button" className={QUIET} onClick={() => setShipping(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {actions.includes("mark_shipped") && (
        <>
          <a href="https://apps.goshippo.com/orders" target="_blank" rel="noreferrer" className={PRIMARY}>
            Open in Shippo to buy label
            <ExternalLink aria-hidden className="size-4" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <button type="button" className={RING_BUTTON} disabled={busy} onClick={() => onShippo(order.shippo_order_id ? "check" : "push")}>
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {order.shippo_order_id ? "Check Shippo" : "Send to Shippo"}
          </button>
          <button type="button" className={QUIET} disabled={busy} onClick={() => setShipping(true)}>
            Mark shipped…
          </button>
        </>
      )}
      {actions.includes("mark_delivered") && (
        <>
          {order.tracking_number && (
            <a
              href={order.tracking_url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className={cn("inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand-blue hover:bg-line-soft", FOCUS_ON_LIGHT)}
            >
              Track {order.tracking_number}
              <ExternalLink aria-hidden className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
          <button type="button" className={RING_BUTTON} disabled={busy} onClick={() => onAction("mark_delivered")}>
            Mark delivered
          </button>
        </>
      )}
      {paid && (
        <button type="button" className={QUIET} disabled={busy} onClick={onRefund}>
          Refund…
        </button>
      )}
    </div>
  );
}
