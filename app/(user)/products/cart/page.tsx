"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useProductCart } from "@/context/product-cart-context";
import { cartTotals, unitPrice } from "@/lib/products/cart";
import AuthPromptModal from "@/components/user/authPromptModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import type { ProductRow } from "@/types/db";

const STORE_ADDRESS = "10410 S Main St, Houston, TX 77025";

export default function ProductCartPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { items, remove, setQty } = useProductCart();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // (Re)load the products in the cart + the delivery fee. Also called after a
  // checkout error so stale stock/prices refresh.
  const loadData = async () => {
    const ids = items.map((i) => i.productId);
    const [productsRes, settingsRes] = await Promise.all([
      ids.length
        ? supabase.from("products").select("*").in("id", ids)
        : Promise.resolve({ data: [] as ProductRow[], error: null }),
      supabase
        .from("store_settings")
        .select("delivery_fee")
        .eq("id", 1)
        .maybeSingle(),
    ]);
    setProducts(productsRes.data ?? []);
    setDeliveryFee(settingsRes.data?.delivery_fee ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const totals = cartTotals(items, products, deliveryFee, method);

  const handleCheckout = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setCheckingOut(true);
    try {
      const res = await fetch("/api/products/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, fulfillment_method: method }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Checkout failed");
        loadData(); // stock or availability may have changed
        return;
      }
      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      toast.error("Checkout failed — please try again");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container mx-auto flex-1 px-4 py-24 text-center">
        <ShoppingBasket className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Your cart is empty</h1>
        <p className="mb-6 text-muted-foreground">
          Browse our car care products and add something you like.
        </p>
        <Link href="/products">
          <Button className="bg-blue-900 hover:bg-blue-800">Shop products</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6 py-10">
        <h1 className="text-3xl font-bold text-blue-900">Your cart</h1>

        {/* Line items */}
        <Card>
          <CardContent className="divide-y p-0">
            {items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              if (!product) {
                return (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-4"
                  >
                    <span className="text-muted-foreground">
                      This product is no longer available.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(item.productId)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                );
              }
              return (
                <div key={item.productId} className="flex items-center gap-4 p-4">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={80}
                      height={60}
                      className="rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-15 w-20 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${unitPrice(product).toFixed(2)} each
                      {item.quantity >= product.stock && (
                        <span className="ml-2 text-amber-600">
                          Only {product.stock} in stock
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        setQty(item.productId, item.quantity - 1, product.stock)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Increase quantity"
                      disabled={item.quantity >= product.stock}
                      onClick={() =>
                        setQty(item.productId, item.quantity + 1, product.stock)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-20 text-right font-medium">
                    ${(unitPrice(product) * item.quantity).toFixed(2)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${product.name}`}
                    onClick={() => remove(item.productId)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Fulfillment choice */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How do you want to get it?</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as "pickup" | "delivery")}
              className="space-y-3"
            >
              <label
                htmlFor="pickup"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-data-[state=checked]:border-blue-900"
              >
                <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
                <div>
                  <p className="font-medium">Pickup at the store — Free</p>
                  <p className="text-sm text-muted-foreground">
                    {STORE_ADDRESS}. We&apos;ll email you when your order is
                    ready.
                  </p>
                </div>
              </label>
              <label
                htmlFor="delivery"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-data-[state=checked]:border-blue-900"
              >
                <RadioGroupItem value="delivery" id="delivery" className="mt-1" />
                <div>
                  <p className="font-medium">
                    Delivery —{" "}
                    {deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : "Free"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We deliver locally around Houston. You&apos;ll enter your
                    address at checkout.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Totals + checkout */}
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            {method === "delivery" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>${totals.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
            <Button
              className="mt-4 w-full bg-blue-900 py-6 text-lg hover:bg-blue-800"
              onClick={handleCheckout}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {user ? "Checkout" : "Sign in to checkout"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Secure payment by Stripe.
            </p>
          </CardContent>
        </Card>
      </div>

      <AuthPromptModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        next="/products/cart"
      />
    </main>
  );
}
