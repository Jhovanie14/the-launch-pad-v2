"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Phone, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
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
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT, RING_BUTTON, SURFACE } from "@/components/booking/ui/focus";
import { BUSINESS_TIME_ZONE } from "@/lib/dashboard/home";
import {
  PAID_VIA_LABEL,
  customerStatus,
  houstonDateLabel,
  isUnpaidReservation,
  staffActionsFor,
  staffQueue,
  type FlowOrder,
  type PaidVia,
  type StaffAction,
} from "@/lib/products/orderFlow";
import { DEFAULT_HOLD_DAYS, getPickupSettings } from "@/lib/products/storeSettings";
import { matchesOrderSearch } from "@/lib/admin/orderSearch";
import type { ProductOrderItemRow, ProductOrderRow } from "@/types/db";

type OrderWithItems = ProductOrderRow & { product_order_items: ProductOrderItemRow[] };
type Customer = { email: string | null; full_name: string | null };
type Tab = "to_pack" | "ready" | "unpaid" | "completed" | "closed";

const TABS: { key: Tab; label: string }[] = [
  { key: "to_pack", label: "To pack" },
  { key: "ready", label: "Ready" },
  { key: "unpaid", label: "Unpaid" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Closed" },
];
const COUNTED: Tab[] = ["to_pack", "ready", "unpaid"];
/** Orders load a page at a time, filtered in the database. */
const PAGE_SIZE = 25;
const SEARCH_LIMIT = 200;
const COUNTER_METHODS: PaidVia[] = ["cash", "card_reader", "zelle", "counter_qr"];

const PRIMARY = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-night px-4 text-sm font-bold text-on-night transition-colors hover:bg-dusk disabled:opacity-60 motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);
const QUIET = cn(
  "inline-flex h-11 items-center rounded-lg px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-line-soft hover:text-ink motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);

const money = (n: number) => `$${Number(n).toFixed(2)}`;
const ref = (o: { id: string }) => o.id.slice(0, 8).toUpperCase();
const flow = (o: OrderWithItems) => o as unknown as FlowOrder;

/** Narrow a product_orders query to one tab, in the database. */
function forTab(query: any, tab: Tab) {
  switch (tab) {
    case "to_pack":
      return query.eq("fulfilment_status", "placed").or("payment_status.eq.paid,payment_method.eq.at_store");
    case "ready":
      return query.in("fulfilment_status", ["ready", "out_for_delivery"]);
    case "unpaid":
      return query.eq("payment_method", "at_store").eq("payment_status", "unpaid").in("fulfilment_status", ["placed", "ready"]);
    case "completed":
      return query.eq("fulfilment_status", "completed").neq("payment_status", "refunded");
    case "closed":
      // Abandoned card checkouts (cancelled and never paid) are left out.
      return query.or(
        "fulfilment_status.eq.released,payment_status.eq.refunded,and(fulfilment_status.eq.cancelled,payment_status.eq.paid)",
      );
  }
}

function placedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  });
}

export default function OrdersView() {
  const supabase = createClient();

  const [tab, setTab] = useState<Tab | null>(null);
  const [counts, setCounts] = useState<Partial<Record<Tab, number>>>({});
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ id: string; action: "hand_over" | "take_payment" } | null>(null);
  const [paidVia, setPaidVia] = useState<PaidVia>("cash");
  const [releaseTarget, setReleaseTarget] = useState<OrderWithItems | null>(null);
  const [refundTarget, setRefundTarget] = useState<OrderWithItems | null>(null);

  // The search box waits for a pause in typing.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const fetchCounts = useCallback(async () => {
    const results = await Promise.all(
      COUNTED.map((t) => forTab(supabase.from("product_orders").select("id", { count: "exact", head: true }), t)),
    );
    const next: Partial<Record<Tab, number>> = {};
    COUNTED.forEach((t, i) => (next[t] = results[i].count ?? 0));
    setCounts(next);
    // Open on the work: To pack, or Ready when nothing needs packing.
    setTab((current) => current ?? ((next.to_pack ?? 0) > 0 ? "to_pack" : "ready"));
  }, [supabase]);

  const fetchOrders = useCallback(async () => {
    if (!tab && !search) return;
    let rows: OrderWithItems[];
    if (search) {
      const { data, error } = await supabase
        .from("product_orders")
        .select("*, product_order_items (*)")
        .order("created_at", { ascending: false })
        .limit(SEARCH_LIMIT);
      if (error) {
        toast.error("Failed to load orders");
        setLoading(false);
        return;
      }
      rows = ((data as OrderWithItems[]) ?? []).filter((o) => staffQueue(flow(o)) !== "hidden");
      setHasMore(false);
    } else {
      const { data, error } = await forTab(
        supabase.from("product_orders").select("*, product_order_items (*)").order("created_at", { ascending: false }),
        tab!,
      ).range(0, limit); // one extra row tells us whether there is another page
      if (error) {
        toast.error("Failed to load orders");
        setLoading(false);
        return;
      }
      const all = (data as OrderWithItems[]) ?? [];
      setHasMore(all.length > limit);
      rows = all.slice(0, limit);
    }

    const userIds = [...new Set(rows.map((o) => o.user_id))];
    const map: Record<string, Customer> = {};
    if (userIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", userIds);
      for (const p of profiles ?? []) map[p.id] = { email: p.email, full_name: p.full_name };
    }
    setCustomers(map);
    setOrders(
      search ? rows.filter((o) => matchesOrderSearch({ ref: ref(o), phone: o.phone }, map[o.user_id] ?? null, search)) : rows,
    );
    setLoading(false);
  }, [supabase, tab, limit, search]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const refresh = () => {
    fetchCounts();
    fetchOrders();
  };

  async function post(path: string, body: object, orderId: string, done: string): Promise<boolean> {
    setBusyId(orderId);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "That didn't work");
        if (res.status === 409) refresh();
        return false;
      }
      toast.success(done);
      setPanel(null);
      refresh();
      return true;
    } catch {
      toast.error("That didn't work. Check your connection.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  const act = (o: OrderWithItems, action: StaffAction, extra: object = {}) =>
    post(
      "/api/admin/product-orders/action",
      { order_id: o.id, action, ...extra },
      o.id,
      ({
        mark_ready: `${ref(o)} is ready. The customer has been emailed.`,
        hand_over: `${ref(o)} handed over`,
        take_payment: `${ref(o)} paid and handed over`,
        release: `${ref(o)} released`,
        mark_shipped: `${ref(o)} marked shipped. The customer has been emailed.`,
        mark_delivered: `${ref(o)} marked delivered`,
      } satisfies Record<StaffAction, string>)[action],
    );

  return (
    <div className="lp-theme space-y-6 text-ink">
      <h1 className="text-3xl font-black tracking-tight">Store orders</h1>

      <label className="relative block">
        <span className="sr-only">Search orders</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reference, name or phone"
          className={cn("h-11 w-full rounded-lg bg-paper pr-3 pl-10 text-base ring-1 ring-line placeholder:text-ink-subtle", FOCUS_ON_LIGHT)}
        />
      </label>

      {!search && (
        <div role="tablist" aria-label="Order queues" className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const selected = tab === t.key;
            const count = counts[t.key];
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setTab(t.key);
                  setLimit(PAGE_SIZE);
                  setPanel(null);
                  setLoading(true);
                }}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors motion-reduce:transition-none",
                  selected ? "bg-night text-on-night" : "bg-paper text-ink-muted ring-1 ring-line hover:text-ink",
                  FOCUS_ON_LIGHT,
                )}
              >
                {t.label}
                {count !== undefined && <span className={selected ? "text-on-night-muted" : "text-ink-subtle"}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 aria-label="Loading orders" className="size-8 animate-spin text-ink-subtle motion-reduce:animate-none" />
        </div>
      ) : orders.length === 0 ? (
        <p className={cn(SURFACE, "p-6 text-ink-muted")}>
          {search ? `No orders match "${search}".` : "Nothing here right now."}
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <OrderCard
                order={o}
                customer={customers[o.user_id] ?? null}
                busy={busyId === o.id}
                panel={panel?.id === o.id ? panel.action : null}
                paidVia={paidVia}
                onPaidVia={setPaidVia}
                onOpenPanel={(action) => {
                  setPaidVia("cash");
                  setPanel({ id: o.id, action });
                }}
                onClosePanel={() => setPanel(null)}
                onAction={(action, extra) => act(o, action, extra)}
                onRelease={() => setReleaseTarget(o)}
                onRefund={() => setRefundTarget(o)}
              />
            </li>
          ))}
        </ul>
      )}

      {hasMore && !search && (
        <button type="button" className={RING_BUTTON} onClick={() => setLimit((n) => n + PAGE_SIZE)}>
          Show more
        </button>
      )}

      <PickupSettingsPanel />

      <AlertDialog open={!!releaseTarget} onOpenChange={(open) => !open && setReleaseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release reservation {releaseTarget && ref(releaseTarget)}?</AlertDialogTitle>
            <AlertDialogDescription>
              The items go back on the shelf and the customer is emailed. Nothing was charged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (releaseTarget) act(releaseTarget, "release");
                setReleaseTarget(null);
              }}
            >
              Release reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <AlertDialogContent>
          {refundTarget && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {refundTarget.paid_via === "stripe"
                    ? `Refund ${money(refundTarget.total)} to the customer's card?`
                    : `Record a ${money(refundTarget.total)} refund at the store?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {refundTarget.paid_via === "stripe"
                    ? "Stripe refunds the card now."
                    : "Hand the money back yourself; this marks the order refunded."}{" "}
                  {refundTarget.fulfilment_status === "completed"
                    ? "The items were already handed over, so stock stays as it is."
                    : "The items go back on the shelf."}{" "}
                  The customer is emailed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const o = refundTarget;
                    setRefundTarget(null);
                    post("/api/admin/product-orders/refund", { order_id: o.id }, o.id, `${ref(o)} refunded`);
                  }}
                >
                  Refund
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warn" | "ok" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold",
        tone === "warn" && "bg-flame/35 text-ink",
        tone === "ok" && "bg-night text-on-night",
        tone === "neutral" && "bg-line-soft text-ink-muted",
      )}
    >
      {children}
    </span>
  );
}

function OrderCard({
  order,
  customer,
  busy,
  panel,
  paidVia,
  onPaidVia,
  onOpenPanel,
  onClosePanel,
  onAction,
  onRelease,
  onRefund,
}: {
  order: OrderWithItems;
  customer: Customer | null;
  busy: boolean;
  panel: "hand_over" | "take_payment" | null;
  paidVia: PaidVia;
  onPaidVia: (v: PaidVia) => void;
  onOpenPanel: (action: "hand_over" | "take_payment") => void;
  onClosePanel: () => void;
  onAction: (action: StaffAction, extra?: object) => void;
  onRelease: () => void;
  onRefund: () => void;
}) {
  const f = flow(order);
  const actions = staffActionsFor(f);
  const unpaid = isUnpaidReservation(f);
  const today = houstonDateLabel(new Date().toISOString());
  const holdLabel = order.hold_until ? houstonDateLabel(order.hold_until) : null;
  const status = customerStatus(f);

  return (
    <article aria-labelledby={`order-${order.id}`} className={cn(SURFACE, "p-4 sm:p-5")}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id={`order-${order.id}`} className="text-3xl leading-none font-black tracking-wide">
          {ref(order)}
        </h2>
        <p className="text-sm text-ink-muted">
          {customer?.full_name || "Customer"}
          {customer?.email && <> · {customer.email}</>}
        </p>
        {order.phone && (
          <a href={`tel:${order.phone}`} className={cn("inline-flex items-center gap-1 rounded text-sm font-semibold text-brand-blue", FOCUS_ON_LIGHT)}>
            <Phone aria-hidden className="size-3.5" />
            {order.phone}
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {unpaid && <Tag tone="warn">Pay at store · {money(order.total)} due</Tag>}
        {order.payment_status === "paid" && (
          <Tag tone="ok">{order.paid_via === "stripe" ? "Paid by card" : `Paid · ${PAID_VIA_LABEL[order.paid_via as PaidVia] ?? "Store"}`}</Tag>
        )}
        {order.fulfilment_status === "cancelled" && order.payment_status === "paid" ? (
          <Tag tone="warn">Paid after cancelling: refund</Tag>
        ) : unpaid && holdLabel && holdLabel === today ? (
          <Tag tone="warn">Hold ends today</Tag>
        ) : unpaid && holdLabel ? (
          <Tag>Ready · held until {holdLabel}</Tag>
        ) : (
          <Tag>{status.label}</Tag>
        )}
      </div>

      <p className="mt-3 text-sm">
        {order.product_order_items.map((i) => `${i.name} × ${i.quantity}`).join(" · ")}
      </p>
      <p className="mt-1 text-xs text-ink-subtle">
        Placed {placedAt(order.created_at)} · {money(order.total)}
      </p>

      {panel === "take_payment" && (
        <fieldset className="mt-4 rounded-xl bg-canvas p-4 ring-1 ring-line">
          <legend className="sr-only">Payment method</legend>
          <p className="mb-2 text-sm font-bold">How did they pay {money(order.total)}?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COUNTER_METHODS.map((m) => (
              <label
                key={m}
                className="flex h-12 cursor-pointer items-center justify-center rounded-lg bg-paper text-sm font-semibold ring-1 ring-line has-[:checked]:text-brand-blue has-[:checked]:ring-2 has-[:checked]:ring-brand-blue"
              >
                <input
                  type="radio"
                  name={`paid-via-${order.id}`}
                  value={m}
                  checked={paidVia === m}
                  onChange={() => onPaidVia(m)}
                  className={cn("sr-only", FOCUS_ON_LIGHT)}
                />
                {PAID_VIA_LABEL[m]}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={PRIMARY} disabled={busy} onClick={() => onAction("take_payment", { paid_via: paidVia })}>
              {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
              Confirm paid &amp; handed over
            </button>
            <button type="button" className={QUIET} onClick={onClosePanel}>
              Cancel
            </button>
          </div>
        </fieldset>
      )}

      {panel === "hand_over" && (
        <div className="mt-4 rounded-xl bg-canvas p-4 ring-1 ring-line">
          <p className="text-sm font-bold">Hand over {ref(order)}? Check the items with the customer.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={PRIMARY} disabled={busy} onClick={() => onAction("hand_over")}>
              {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
              Confirm handed over
            </button>
            <button type="button" className={QUIET} onClick={onClosePanel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!panel && (actions.length > 0 || order.payment_status === "paid") && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {actions.includes("mark_ready") && (
            <button type="button" className={PRIMARY} disabled={busy} onClick={() => onAction("mark_ready")}>
              {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
              Mark ready
            </button>
          )}
          {actions.includes("hand_over") && (
            <button
              type="button"
              className={actions[0] === "hand_over" ? PRIMARY : RING_BUTTON}
              disabled={busy}
              onClick={() => onOpenPanel("hand_over")}
            >
              Hand over
            </button>
          )}
          {actions.includes("take_payment") && (
            <button
              type="button"
              className={actions[0] === "take_payment" ? PRIMARY : RING_BUTTON}
              disabled={busy}
              onClick={() => onOpenPanel("take_payment")}
            >
              Take payment &amp; hand over
            </button>
          )}
          {actions.includes("release") && (
            <button type="button" className={QUIET} disabled={busy} onClick={onRelease}>
              Release
            </button>
          )}
          {order.payment_status === "paid" && (
            <button type="button" className={QUIET} disabled={busy} onClick={onRefund}>
              Refund…
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/** Pickup hours, pickup note and the unpaid hold: one setting each, shown to customers. */
function PickupSettingsPanel() {
  const supabase = createClient();
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [holdDays, setHoldDays] = useState(String(DEFAULT_HOLD_DAYS));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPickupSettings(supabase).then((s) => {
      setHours(s.pickupHours ?? "");
      setNote(s.pickupNote ?? "");
      setHoldDays(String(s.holdDays));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/store-settings/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickup_hours: hours, pickup_note: note, hold_days: Number(holdDays) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the settings");
      toast.success("Pickup settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className={cn(SURFACE, "p-4 sm:p-5")}>
      <summary className={cn("cursor-pointer rounded text-base font-bold", FOCUS_ON_LIGHT)}>Pickup settings</summary>
      <form onSubmit={save} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold">Pickup hours</span>
          <span className="block text-sm text-ink-muted">Shown in the cart, on the pickup pass and in emails. Leave empty to hide.</span>
          <input
            type="text"
            value={hours}
            maxLength={120}
            onChange={(e) => setHours(e.target.value)}
            placeholder="For example: Thu–Sun, 9:30 AM–6:30 PM"
            className={cn("mt-2 h-11 w-full rounded-lg bg-paper px-3 text-base ring-1 ring-line placeholder:text-ink-subtle", FOCUS_ON_LIGHT)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Pickup instructions</span>
          <span className="block text-sm text-ink-muted">Optional. Shown under the pickup hours.</span>
          <textarea
            value={note}
            maxLength={200}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For example: Ask for Armando at the carwash. Bring your ID and your order email or receipt."
            className={cn("mt-2 w-full rounded-lg bg-paper px-3 py-2 text-base ring-1 ring-line placeholder:text-ink-subtle", FOCUS_ON_LIGHT)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Hold unpaid orders for</span>
          <span className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={14}
              step={1}
              value={holdDays}
              onChange={(e) => setHoldDays(e.target.value)}
              className={cn("h-11 w-20 rounded-lg bg-paper px-3 text-base ring-1 ring-line", FOCUS_ON_LIGHT)}
            />
            <span className="text-sm text-ink-muted">days after they&apos;re marked ready</span>
          </span>
        </label>
        <button type="submit" className={PRIMARY} disabled={saving}>
          {saving && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Save pickup settings
        </button>
      </form>
    </details>
  );
}
