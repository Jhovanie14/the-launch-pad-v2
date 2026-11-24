"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT, SURFACE } from "@/components/booking/ui/focus";
import { unitPrice } from "@/lib/products/cart";
import { productTitle } from "@/lib/products/describe";
import {
  chipCounts,
  matchesChip,
  matchesProductSearch,
  needsList,
  parseStockInput,
  receivePatch,
  type ProductChip,
} from "@/lib/admin/productsList";
import type { ProductRow } from "@/types/db";

const CHIPS: { key: ProductChip; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
  { key: "needs", label: "Needs content" },
  { key: "hidden", label: "Hidden" },
];

const PRIMARY = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-night px-4 text-sm font-bold text-on-night transition-colors hover:bg-dusk disabled:opacity-60 motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);
const SMALL_RING = cn(
  "inline-flex h-11 items-center gap-1.5 rounded-lg bg-paper px-3 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-canvas motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);
const money = (n: number) => `$${Number(n).toFixed(2)}`;

/**
 * The stock-first products list: a line of counts, search and chips, then a
 * table (cards on phones) where each row can receive stock, be shown or
 * hidden, edited, or deleted after a confirm.
 */
export function ProductsList({
  products,
  onEdit,
  onChanged,
}: {
  products: ProductRow[];
  onEdit: (product: ProductRow) => void;
  /** Reload from the database after a change. */
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [chip, setChip] = useState<ProductChip>("all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);

  const counts = useMemo(() => chipCounts(products), [products]);
  const visible = products.filter((p) => matchesChip(p, chip) && matchesProductSearch(p, search));

  async function setShown(product: ProductRow, next: boolean) {
    const { error } = await supabase
      .from("products")
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq("id", product.id);
    if (error) return void toast.error("Couldn't update the product");
    toast.success(`${productTitle(product)} is ${next ? "shown in" : "hidden from"} the shop`);
    onChanged();
  }

  async function remove(product: ProductRow) {
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      console.error(error);
      return void toast.error("Couldn't delete the product");
    }
    toast.success(`${productTitle(product)} deleted`);
    onChanged();
  }

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-muted">
        {counts.all} {counts.all === 1 ? "product" : "products"}
        {(
          [
            ["out", `${counts.out} out of stock`],
            ["low", `${counts.low} running low`],
            ["needs", `${counts.needs} need content`],
          ] as const
        )
          .filter(([key]) => counts[key] > 0)
          .map(([key, text]) => (
            <span key={key}>
              ·{" "}
              <button type="button" onClick={() => setChip(key)} className={cn("rounded font-semibold text-brand-blue hover:underline", FOCUS_ON_LIGHT)}>
                {text}
              </button>
            </span>
          ))}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Search products</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-subtle" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className={cn("h-11 w-full rounded-lg bg-paper pr-3 pl-10 text-base ring-1 ring-line placeholder:text-ink-subtle", FOCUS_ON_LIGHT)}
          />
        </label>
        <div role="group" aria-label="Filter products" className="flex flex-wrap gap-2">
          {CHIPS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={chip === key}
              onClick={() => setChip(key)}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors motion-reduce:transition-none",
                chip === key ? "bg-night text-on-night" : "bg-paper text-ink-muted ring-1 ring-line hover:text-ink",
                FOCUS_ON_LIGHT,
              )}
            >
              {label}
              <span className={chip === key ? "text-on-night-muted" : "text-ink-subtle"}>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className={cn(SURFACE, "p-6 text-ink-muted")}>
          {products.length === 0 ? "No products yet. Add your first one." : "No products match."}
        </p>
      ) : (
        <ul className={cn(SURFACE, "divide-y divide-line-soft")}>
          {visible.map((product) => (
            <li key={product.id}>
              <ProductRowView
                product={product}
                onEdit={() => onEdit(product)}
                onShown={(v) => setShown(product, v)}
                onDelete={() => setDeleteTarget(product)}
                onChanged={onChanged}
              />
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget && productTitle(deleteTarget)} permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Hiding it is usually enough. Past orders keep their own copy of the name and price either way.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) remove(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductRowView({
  product,
  onEdit,
  onShown,
  onDelete,
  onChanged,
}: {
  product: ProductRow;
  onEdit: () => void;
  onShown: (v: boolean) => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const title = productTitle(product);
  const needs = needsList(product);
  const out = product.stock === 0;
  const low = !out && matchesChip(product, "low");
  const switchId = `shown-${product.id}`;

  return (
    <div className="grid grid-cols-[3rem_1fr] gap-x-3 gap-y-3 p-3 sm:p-4 xl:grid-cols-[3rem_minmax(0,1fr)_8rem_6rem_14rem_8rem_auto] xl:items-center">
      <div className="relative size-12 overflow-hidden rounded-lg bg-line-soft ring-1 ring-line">
        {product.image_url && <Image src={product.image_url} alt="" fill sizes="48px" className="object-cover" />}
      </div>

      <div className="min-w-0">
        <p className="truncate font-bold">{title}</p>
        {title !== product.name && <p className="truncate text-xs text-ink-subtle">{product.name}</p>}
        {needs.length > 0 && <p className="text-xs text-ink-muted">Needs: {needs.join(", ")}</p>}
      </div>

      <p className="col-start-2 text-sm text-ink-muted xl:col-start-auto">{product.category}</p>

      <p className="col-start-2 text-sm xl:col-start-auto">
        <span className="font-bold">{money(unitPrice(product))}</span>
        {product.sale_price !== null && <span className="ml-1.5 text-ink-subtle line-through">{money(product.price)}</span>}
      </p>

      <div className="col-start-2 flex items-center gap-2 xl:col-start-auto">
        <span className="min-w-12 text-base font-black">{product.stock}</span>
        {out && <span className="rounded-full bg-line-soft px-2 py-0.5 text-xs font-bold text-ink-muted">Out</span>}
        {low && <span className="rounded-full bg-flame/35 px-2 py-0.5 text-xs font-bold text-ink">Low</span>}
        <ReceiveStock product={product} onDone={onChanged} />
      </div>

      <div className="col-start-2 flex min-h-11 items-center gap-2 xl:col-start-auto">
        <Switch id={switchId} checked={product.is_active} onCheckedChange={onShown} aria-label={`Show ${title} in the shop`} />
        <span className="text-sm text-ink-muted">{product.is_active ? "Shown" : "Hidden"}</span>
      </div>

      <div className="col-start-2 flex gap-2 xl:col-start-auto xl:justify-end">
        <button type="button" className={SMALL_RING} onClick={onEdit}>Edit</button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`More actions for ${title}`} className={cn(SMALL_RING, "w-11 justify-center px-0")}>
              <MoreHorizontal aria-hidden className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onShown(!product.is_active)}>
              {product.is_active ? "Hide from the shop" : "Show in the shop"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
              Delete…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** "+ Receive": add a delivery to the count, or set the exact count. */
function ReceiveStock({ product, onDone }: { product: ProductRow; onDone: () => void }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "set">("add");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const title = productTitle(product);
  const parsed = parseStockInput(raw, mode);
  const next = parsed.ok ? receivePatch(product.stock, parsed.value, mode) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.ok) return setError(parsed.error);
    setBusy(true);
    // Guarded on the count we showed: if someone else changed it meanwhile,
    // nothing is written and the list reloads instead of overwriting them.
    const { data, error: dbError } = await supabase
      .from("products")
      .update({ stock: next, updated_at: new Date().toISOString() })
      .eq("id", product.id)
      .eq("stock", product.stock)
      .select("id");
    setBusy(false);
    if (dbError) return void toast.error("Couldn't update the stock");
    if (!data || data.length === 0) {
      toast.error("Stock just changed. Refreshed.");
    } else {
      toast.success(`${title}: ${next} in stock`);
    }
    setOpen(false);
    setRaw("");
    setMode("add");
    onDone();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setError(null);
        if (!o) { setMode("add"); setRaw(""); }
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Receive stock for ${title}`} className={SMALL_RING}>
          <Plus aria-hidden className="size-4" />
          Receive
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="lp-theme w-72 bg-paper text-ink">
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm font-bold">
            {mode === "add" ? "Receive stock" : "Set exact count"}: {title}
          </p>
          <label className="block">
            <span className="sr-only">{mode === "add" ? "How many arrived" : "Exact count"}</span>
            <input
              autoFocus
              inputMode="numeric"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setError(null);
              }}
              placeholder={mode === "add" ? "How many arrived?" : "Count on the shelf"}
              aria-invalid={!!error}
              className={cn("h-11 w-full rounded-lg bg-paper px-3 text-base font-bold ring-1 ring-line placeholder:font-normal placeholder:text-ink-subtle", FOCUS_ON_LIGHT)}
            />
          </label>
          <p className="text-xs text-ink-muted" aria-live="polite">
            {error ??
              (mode === "add"
                ? `Adds to the ${product.stock} on hand${next !== null ? `, making ${next}` : ""}.`
                : `Replaces the ${product.stock} on hand.`)}
          </p>
          <button type="submit" className={cn(PRIMARY, "w-full")} disabled={busy}>
            {mode === "add"
              ? parsed.ok ? `Add ${parsed.value} to stock` : "Add to stock"
              : `Set count to ${parsed.ok ? parsed.value : "…"}`}
          </button>
          <button
            type="button"
            className={cn("text-sm font-semibold text-brand-blue hover:underline", FOCUS_ON_LIGHT)}
            onClick={() => {
              setMode(mode === "add" ? "set" : "add");
              setError(null);
            }}
          >
            {mode === "add" ? "Set exact count instead" : "Receive stock instead"}
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

