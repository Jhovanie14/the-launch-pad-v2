"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT } from "@/components/booking/ui/focus";
import { StorefrontHeroSettings } from "@/components/admin/storefront-hero-settings";
import { ProductsList } from "@/components/admin/products/ProductsList";
import { ProductDrawer } from "@/components/admin/products/ProductDrawer";
import type { ProductRow } from "@/types/db";

const PRIMARY = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-night px-4 text-sm font-bold text-on-night transition-colors hover:bg-dusk motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);
const TAB = cn(
  "h-11 rounded-none border-b-2 border-transparent px-4 text-sm font-semibold text-ink-muted data-[state=active]:border-night data-[state=active]:text-ink data-[state=active]:shadow-none",
  FOCUS_ON_LIGHT,
);

/**
 * Admin › Products: the stock-first list (receive stock, show or hide, edit
 * in a drawer) and, on its own tab, the storefront hero editor.
 */
export default function ProductsView() {
  const supabase = createClient();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<{ open: boolean; product: ProductRow | null }>({ open: false, product: null });

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Failed to load products");
    }
    setProducts(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="lp-theme space-y-5 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight">Products</h1>
        <button type="button" className={PRIMARY} onClick={() => setDrawer({ open: true, product: null })}>
          <Plus aria-hidden className="size-4" />
          Add product
        </button>
      </div>

      <Tabs defaultValue="products">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-line bg-transparent p-0">
          <TabsTrigger value="products" className={TAB}>
            Products
          </TabsTrigger>
          <TabsTrigger value="storefront" className={TAB}>
            Storefront
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="pt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 aria-label="Loading products" className="size-8 animate-spin text-ink-subtle motion-reduce:animate-none" />
            </div>
          ) : (
            <ProductsList
              products={products}
              onEdit={(product) => setDrawer({ open: true, product })}
              onChanged={fetchProducts}
            />
          )}
        </TabsContent>

        <TabsContent value="storefront" className="pt-4">
          <StorefrontHeroSettings />
        </TabsContent>
      </Tabs>

      <ProductDrawer
        open={drawer.open}
        product={drawer.product}
        products={products}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={fetchProducts}
      />
    </div>
  );
}
