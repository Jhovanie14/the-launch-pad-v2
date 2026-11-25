"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Loader2, MapPin, Minus, Plus, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/auth-context";
import { useProductCart } from "@/context/product-cart-context";
import { cartTotals, unitPrice } from "@/lib/products/cart";
import { DEFAULT_HOLD_DAYS, getPickupSettings } from "@/lib/products/storeSettings";
import { cartAnalyticsItems, ecommercePayload } from "@/lib/analytics/ecommerce";
import { trackEvent } from "@/lib/analytics/gtag";
import AuthPromptModal from "@/components/user/authPromptModal";
import { cn } from "@/lib/utils";
import { FLAME_BUTTON, FOCUS_ON_LIGHT, SURFACE } from "@/components/booking/ui/focus";
import type { ProductRow } from "@/types/db";

const STORE_ADDRESS = "10410 S Main St, Houston";
type PaymentChoice = "card" | "at_store";

const money = (n: number) => `$${n.toFixed(2)}`;

const STEP_BUTTON = cn(
  "grid size-11 place-items-center text-ink transition-colors hover:bg-line-soft disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);
const QUIET_BUTTON = cn(
  "inline-flex h-11 items-center rounded-lg px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-line-soft hover:text-ink motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);

export default function ProductCartPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { items, remove, setQty } = useProductCart();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [pickupHours, setPickupHours] = useState<string | null>(null);
  const [pickupNote, setPickupNote] = useState<string | null>(null);
  const [holdDays, setHoldDays] = useState(DEFAULT_HOLD_DAYS);
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentChoice>("card");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  // (Re)load the products in the cart and the pickup settings. Also called
  // after a checkout error so stale stock and prices refresh.
  const loadData = async () => {
    const ids = items.map((i) => i.productId);
    const [productsRes, settings] = await Promise.all([
      ids.length
        ? supabase.from("products").select("*").in("id", ids)
        : Promise.resolve({ data: [] as ProductRow[], error: null }),
      getPickupSettings(supabase),
    ]);
    setProducts((productsRes.data ?? []) as ProductRow[]);
    setPickupHours(settings.pickupHours);
    setPickupNote(settings.pickupNote);
    setHoldDays(settings.holdDays);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Pickup is the only method offered while delivery waits on a courier, so
  // there is no fee. cartTotals keeps its delivery arguments for when it returns.
  const totals = cartTotals(items, products, 0, "pickup");
  const count = items.reduce((n, i) => n + i.quantity, 0);

  const handleCheckout = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setCheckingOut(true);
    setCheckoutError(null);
    trackEvent("begin_checkout", ecommercePayload(cartAnalyticsItems(items, products)));
    try {
      const res = await fetch("/api/products/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, fulfillment_method: "pickup", payment_method: payment }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error || "Checkout failed";
        setCheckoutError(message);
        toast.error(message);
        loadData(); // stock or availability may have changed
        return;
      }
      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      setCheckoutError("Checkout failed. Please try again.");
      toast.error("Checkout failed. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <main className="lp-theme flex flex-1 items-center justify-center bg-canvas py-32">
        <Loader2 aria-label="Loading your cart" className="size-8 animate-spin text-ink-subtle motion-reduce:animate-none" />
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="lp-theme flex-1 bg-canvas px-4 py-24 text-center text-ink">
        <ShoppingBasket aria-hidden className="mx-auto mb-4 size-12 text-ink-subtle" />
        <h1 className="mb-2 text-2xl font-black tracking-tight">Your cart is empty</h1>
        <p className="mb-6 text-ink-muted">Browse our car care products and add something you like.</p>
        <Link href="/products" className={FLAME_BUTTON}>
          Shop products
        </Link>
      </main>
    );
  }

  const ctaLabel = !user
    ? "Sign in to check out"
    : payment === "card"
      ? `Pay ${money(totals.total)} now`
      : "Reserve for pickup";

  return (
    <main className="lp-theme flex-1 bg-canvas text-ink">
      <div className="mx-auto max-w-2xl px-4 pt-8 sm:pt-12">
        <h1 className="text-3xl font-black tracking-tight">Your cart</h1>

        {/* Line items */}
        <ul className={cn(SURFACE, "mt-6 divide-y divide-line-soft")}>
          {items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) {
              return (
                <li key={item.productId} className="flex items-center justify-between gap-3 p-4">
                  <span className="text-ink-muted">This product is no longer available.</span>
                  <button type="button" className={QUIET_BUTTON} onClick={() => remove(item.productId)}>
                    Remove
                  </button>
                </li>
              );
            }
            const price = unitPrice(product);
            return (
              <li key={item.productId} className="grid grid-cols-[4rem_1fr] gap-x-3 p-4">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 rounded-lg object-cover"
                  />
                ) : (
                  <div aria-hidden className="size-16 rounded-lg bg-line-soft" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{product.name}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {money(price)} each
                    {item.quantity >= product.stock && <span> · Only {product.stock} left</span>}
                  </p>
                </div>
                <div className="col-start-2 mt-2 flex items-center gap-2">
                  <div className="flex items-center rounded-lg ring-1 ring-line">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${product.name}`}
                      className={cn(STEP_BUTTON, "rounded-l-lg")}
                      onClick={() => setQty(item.productId, item.quantity - 1, product.stock)}
                    >
                      <Minus aria-hidden className="size-4" />
                    </button>
                    <span aria-live="polite" className="w-8 text-center font-bold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${product.name}`}
                      className={cn(STEP_BUTTON, "rounded-r-lg")}
                      disabled={item.quantity >= product.stock}
                      onClick={() => setQty(item.productId, item.quantity + 1, product.stock)}
                    >
                      <Plus aria-hidden className="size-4" />
                    </button>
                  </div>
                  <span className="ml-auto font-semibold">{money(price * item.quantity)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${product.name}`}
                    className={QUIET_BUTTON}
                    onClick={() => remove(item.productId)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Pickup: the only method while delivery is paused, so it is stated,
            not chosen. */}
        <h2 className="mt-8 mb-2 text-sm font-semibold text-ink-muted">Pickup</h2>
        <div className={cn(SURFACE, "flex gap-3 p-4 text-sm leading-relaxed")}>
          <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-blue" />
          <div>
            <p className="font-semibold text-ink">{STORE_ADDRESS}</p>
            {pickupHours && <p className="text-ink-muted">Pickup hours: {pickupHours}</p>}
            {pickupNote && <p className="text-ink-muted">{pickupNote}</p>}
            <p className="text-ink-muted">We&apos;ll email you when it&apos;s ready.</p>
          </div>
        </div>

        {/* Payment choice */}
        <fieldset className="mt-8">
          <legend className="mb-2 text-sm font-semibold text-ink-muted">How do you want to pay?</legend>
          <div className="space-y-3">
            {(
              [
                ["card", "Pay now by card", "Secure checkout with Stripe. Nothing to pay at pickup."],
                [
                  "at_store",
                  "Pay at the store",
                  `Cash, card or Zelle when you collect. We hold it ${holdDays} ${holdDays === 1 ? "day" : "days"} after it's ready.`,
                ],
              ] as const
            ).map(([value, title, line]) => (
              <label
                key={value}
                className="flex cursor-pointer gap-3 rounded-2xl bg-paper p-4 ring-1 ring-line transition-shadow has-[:checked]:ring-2 has-[:checked]:ring-brand-blue motion-reduce:transition-none"
              >
                <input
                  type="radio"
                  name="payment"
                  value={value}
                  checked={payment === value}
                  onChange={() => {
                    setPayment(value);
                    setCheckoutError(null);
                  }}
                  className={cn("mt-0.5 size-5 shrink-0 accent-brand-blue", FOCUS_ON_LIGHT)}
                />
                <span className="text-sm leading-relaxed">
                  <span className="block text-base font-semibold text-ink">{title}</span>
                  <span className="text-ink-muted">{line}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <dl className="mt-6 space-y-1 px-1 text-sm">
          <div className="flex justify-between text-ink-muted">
            <dt>Subtotal</dt>
            <dd>{money(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-lg font-black text-ink">
            <dt>Total</dt>
            <dd>{money(totals.total)}</dd>
          </div>
        </dl>

        {checkoutError && (
          <p
            role="alert"
            className="mt-4 flex gap-2 rounded-xl bg-paper p-3 text-sm font-medium text-ink ring-1 ring-line"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-red" />
            {checkoutError}
          </p>
        )}
      </div>

      {/* Sticky Night bar: count, total and the one flame action. It sits in
          the page flow, so it rests above the footer at the end. */}
      <div className="sticky bottom-0 z-30 mt-8 bg-night px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-on-night">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex justify-between text-sm text-on-night-muted">
            <span>
              {count} {count === 1 ? "item" : "items"} · pickup
            </span>
            <span className="font-semibold text-on-night">{money(totals.total)}</span>
          </div>
          <button type="button" onClick={handleCheckout} disabled={checkingOut} className={cn(FLAME_BUTTON, "w-full")}>
            {checkingOut && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />}
            {ctaLabel}
          </button>
          {!user && (
            <p className="mt-2 text-center text-xs text-on-night-subtle">
              We&apos;ll email you when your order is ready to collect.
            </p>
          )}
        </div>
      </div>

      <AuthPromptModal open={authOpen} onClose={() => setAuthOpen(false)} next="/products/cart" />
    </main>
  );
}
