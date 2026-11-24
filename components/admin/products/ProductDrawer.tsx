"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { FOCUS_ON_LIGHT, RING_BUTTON } from "@/components/booking/ui/focus";
import { EMPTY_FORM, SHORT_NAME_MAX, buildProductPayload, formFromProduct, isDirty, type ProductForm } from "@/lib/admin/productForm";
import { productTitle } from "@/lib/products/describe";
import { MAX_VIDEO_BYTES, VIDEO_MIME_TYPES, rejectVideo } from "@/lib/products/media";
import { rejectImage } from "@/lib/products/upload";
import { uploadProductMedia } from "@/lib/products/upload-media";
import { uniqueSlug } from "@/lib/products/slug";
import type { ProductRow } from "@/types/db";

/**
 * Enough parallel uploads that a batch of ten gallery shots feels quick, few
 * enough not to swamp the admin's connection or the route.
 */
const GALLERY_CONCURRENCY = 3;

const PRIMARY = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-night px-4 text-sm font-bold text-on-night transition-colors hover:bg-dusk disabled:opacity-60 motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);
const FIELD = cn("h-11 w-full rounded-lg bg-paper px-3 text-base ring-1 ring-line placeholder:text-ink-subtle", FOCUS_ON_LIGHT);
const LABEL = "block text-sm font-semibold text-ink";
const HELP = "mt-1 block text-xs text-ink-subtle";

/**
 * Add or edit a product in a right-side drawer, in sections: Basics, Price
 * and stock, Photos and video, In the shop. Closing with unsaved changes asks
 * first. A null product means "add".
 */
export function ProductDrawer({
  open,
  product,
  products,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: ProductRow | null;
  products: ProductRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [initial, setInitial] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // A count, not a flag: a gallery batch can still be running when the admin
  // starts a video upload, and the first to finish must not clear the other.
  const [pendingUploads, setPendingUploads] = useState(0);
  const [galleryProgress, setGalleryProgress] = useState<{ done: number; total: number } | null>(null);
  const [galleryDragging, setGalleryDragging] = useState(false);
  const uploading = pendingUploads > 0;

  // A fresh form each time the drawer opens.
  useEffect(() => {
    if (!open) return;
    const start = product ? formFromProduct(product) : EMPTY_FORM;
    setForm(start);
    setInitial(start);
  }, [open, product]);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);
  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  function requestClose() {
    if (isDirty(form, initial)) setConfirmDiscard(true);
    else onClose();
  }

  /**
   * Surface what Supabase actually said. A bare "Failed to upload" hides the
   * two causes that matter (a missing storage policy, a rejected file) and
   * they need different fixes.
   */
  const uploadFailed = (kind: string, error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error ?? "unknown error");
    console.error(`Error uploading product ${kind}:`, error);
    toast.error(`Failed to upload ${kind}: ${detail}`);
  };

  async function uploadImage(file: File) {
    const problem = rejectImage(file);
    if (problem) return void toast.error(problem);
    setPendingUploads((n) => n + 1);
    try {
      const url = await uploadProductMedia("image", file);
      if (url) set("image_url", url);
    } catch (error) {
      uploadFailed("image", error);
    } finally {
      setPendingUploads((n) => n - 1);
    }
  }

  async function uploadVideo(file: File) {
    const problem = rejectVideo(file);
    if (problem) return void toast.error(problem);
    setPendingUploads((n) => n + 1);
    try {
      const url = await uploadProductMedia("video", file);
      if (url) set("video_url", url);
    } catch (error) {
      uploadFailed("video", error);
    } finally {
      setPendingUploads((n) => n - 1);
    }
  }

  /**
   * Upload a whole selection of gallery images. Invalid files are skipped and
   * named in one toast; the rest upload a few at a time and are added in the
   * order the admin picked them, not the order they finished.
   */
  async function uploadGallery(files: File[]) {
    if (files.length === 0 || galleryProgress) return;
    const skipped: string[] = [];
    const accepted = files.filter((file) => {
      const problem = rejectImage(file);
      if (problem) skipped.push(`${file.name}: ${problem}`);
      return !problem;
    });
    if (skipped.length > 0) {
      toast.error(`Skipped ${skipped.length} file${skipped.length === 1 ? "" : "s"}`, { description: skipped.join("\n") });
    }
    if (accepted.length === 0) return;

    const urls: (string | null)[] = accepted.map(() => null);
    const failures: unknown[] = [];
    let next = 0;
    const worker = async () => {
      while (next < accepted.length) {
        const i = next++;
        try {
          urls[i] = await uploadProductMedia("gallery", accepted[i]);
        } catch (error) {
          console.error(`Error uploading gallery image ${accepted[i].name}:`, error);
          failures.push(error);
        }
        setGalleryProgress((prev) => prev && { ...prev, done: prev.done + 1 });
      }
    };

    setPendingUploads((n) => n + 1);
    setGalleryProgress({ done: 0, total: accepted.length });
    try {
      await Promise.all(Array.from({ length: Math.min(GALLERY_CONCURRENCY, accepted.length) }, worker));
    } finally {
      const added = urls.filter((url): url is string => Boolean(url));
      if (added.length > 0) {
        setForm((prev) => ({ ...prev, gallery: [...prev.gallery, ...added] }));
        toast.success(`Added ${added.length} image${added.length === 1 ? "" : "s"} to the gallery`);
      }
      if (failures.length > 0) {
        const first = failures[0];
        const detail = first instanceof Error ? first.message : String(first ?? "unknown error");
        toast.error(`${failures.length} gallery image${failures.length === 1 ? "" : "s"} failed to upload: ${detail}`);
      }
      setGalleryProgress(null);
      setPendingUploads((n) => n - 1);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const built = buildProductPayload(form, new Date());
    if (!built.ok) return void toast.error(built.error);
    setSaving(true);
    try {
      if (product) {
        // The slug never changes on edit: links and search results point at it.
        const { error } = await supabase.from("products").update(built.payload).eq("id", product.id);
        if (error) {
          console.error(error);
          return void toast.error("Failed to update the product");
        }
        toast.success("Product saved");
      } else {
        const slug = uniqueSlug(built.payload.name, products.map((p) => p.slug));
        const { error } = await supabase.from("products").insert([{ ...built.payload, slug }]);
        if (error) {
          console.error(error);
          // The unique index is the real guard: the slug list comes from state,
          // which can lag another admin's insert.
          return void toast.error(
            error.code === "23505"
              ? "A product with a very similar name already exists. Adjust the name and try again."
              : "Failed to add the product",
          );
        }
        toast.success("Product added");
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const title = product ? `Edit ${productTitle(product)}` : "Add product";

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !next && requestClose()}>
        <SheetContent side="right" className="lp-theme flex w-full flex-col gap-0 bg-paper p-0 text-ink sm:max-w-lg">
          <SheetHeader className="border-b border-line px-5 py-4">
            <SheetTitle className="text-lg font-black tracking-tight text-ink">{title}</SheetTitle>
            <SheetDescription className="sr-only">Product details, price, stock, photos and shop settings</SheetDescription>
          </SheetHeader>

          <form id="product-form" onSubmit={save} className="flex-1 space-y-0 overflow-y-auto px-5">
            <Section title="Basics">
              <Field id="name" label="Name" help="The full name: the page title, search engines and receipts.">
                <input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} className={FIELD} required />
              </Field>
              <Field
                id="display_name"
                label={
                  <>
                    Short name <span className="font-normal text-ink-subtle">(optional)</span>
                  </>
                }
                help={`Shown on cards and as the product page title. Up to ${SHORT_NAME_MAX} characters.`}
              >
                <input
                  id="display_name"
                  value={form.display_name}
                  maxLength={SHORT_NAME_MAX}
                  onChange={(e) => set("display_name", e.target.value)}
                  placeholder="For example: Utility towels, 8-pack"
                  className={FIELD}
                />
              </Field>
              <Field id="category" label="Category" help="Pick one you've used, or type a new one.">
                <input id="category" list="product-categories" value={form.category} onChange={(e) => set("category", e.target.value)} className={FIELD} required />
                <datalist id="product-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field id="description" label="Description" help='Lines like "Size: 15.75 × 15.75 inches" become the Specs table on the product page.'>
                <textarea
                  id="description"
                  rows={6}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className={cn(FIELD, "h-auto py-2.5")}
                />
              </Field>
            </Section>

            <Section title="Price and stock">
              <div className="grid grid-cols-2 gap-3">
                <Field id="price" label="Price">
                  <input id="price" inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} className={FIELD} required />
                </Field>
                <Field id="sale_price" label="Sale price">
                  <input
                    id="sale_price"
                    inputMode="decimal"
                    value={form.sale_price}
                    onChange={(e) => set("sale_price", e.target.value)}
                    placeholder="Optional"
                    className={FIELD}
                  />
                </Field>
              </div>
              <Field id="stock" label="Stock on hand">
                <input id="stock" inputMode="numeric" value={form.stock} onChange={(e) => set("stock", e.target.value)} className={FIELD} />
              </Field>
            </Section>

            <Section title="Photos and video">
              <Field id="image" label="Main photo" help="Shown on the card and first on the product page.">
                <div className="flex items-center gap-3">
                  {form.image_url && (
                    <Image src={form.image_url} alt="Main photo" width={64} height={64} className="size-16 rounded-lg object-cover ring-1 ring-line" />
                  )}
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(file);
                      e.target.value = "";
                    }}
                    className="text-sm"
                  />
                </div>
              </Field>

              <div className="mb-4">
                <span className={LABEL}>More photos</span>
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!galleryProgress) setGalleryDragging(true);
                  }}
                  onDragLeave={(e) => {
                    // dragleave also fires when moving onto the zone's own children.
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setGalleryDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setGalleryDragging(false);
                    uploadGallery(Array.from(e.dataTransfer.files));
                  }}
                  className={cn(
                    "mt-1.5 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-blue",
                    galleryProgress
                      ? "cursor-wait border-line opacity-80"
                      : galleryDragging
                        ? "cursor-copy border-brand-blue bg-canvas"
                        : "cursor-pointer border-line hover:bg-canvas",
                  )}
                >
                  {galleryProgress ? (
                    <>
                      <Loader2 aria-hidden className="size-5 animate-spin text-ink-subtle motion-reduce:animate-none" />
                      <span className="font-semibold" aria-live="polite">
                        Uploading {galleryProgress.done} of {galleryProgress.total}…
                      </span>
                    </>
                  ) : (
                    <>
                      <ImagePlus aria-hidden className="size-5 text-ink-subtle" />
                      <span className="font-semibold">Drop photos here, or click to choose</span>
                      <span className="text-xs text-ink-subtle">Added in the order you pick them.</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={Boolean(galleryProgress)}
                    className="sr-only"
                    onChange={(e) => {
                      uploadGallery(Array.from(e.target.files ?? []));
                      e.target.value = "";
                    }}
                  />
                </label>
                {form.gallery.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {form.gallery.map((url, i) => (
                      <li key={url} className="relative">
                        <Image src={url} alt={`Photo ${i + 2}`} width={64} height={64} className="size-16 rounded-lg object-cover ring-1 ring-line" />
                        <button
                          type="button"
                          onClick={() => set("gallery", form.gallery.filter((g) => g !== url))}
                          aria-label={`Remove photo ${i + 2}`}
                          className={cn("absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-paper ring-1 ring-line", FOCUS_ON_LIGHT)}
                        >
                          <X aria-hidden className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Field
                id="video"
                label="Video (optional)"
                help={`Portrait (9:16), silent, 5 to 10 seconds. MP4 or WebM, under ${Math.round(MAX_VIDEO_BYTES / 1_048_576)} MB.`}
              >
                <input
                  id="video"
                  type="file"
                  accept={VIDEO_MIME_TYPES.join(",")}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadVideo(file);
                    e.target.value = "";
                  }}
                  className="text-sm"
                />
                {form.video_url && (
                  <div className="mt-2 flex items-end gap-3">
                    <video src={form.video_url} muted controls playsInline className="aspect-[9/16] w-28 rounded-lg bg-night object-contain" />
                    <button type="button" className={RING_BUTTON} onClick={() => set("video_url", "")}>
                      Remove video
                    </button>
                  </div>
                )}
              </Field>
              {uploading && !galleryProgress && <p className="pb-3 text-sm text-ink-muted" aria-live="polite">Uploading…</p>}
            </Section>

            <Section title="In the shop" last>
              <ToggleRow id="is_active" label="Shown in the shop" checked={form.is_active} onChange={(v) => set("is_active", v)} />
              <ToggleRow id="is_featured" label="Featured at the top" checked={form.is_featured} onChange={(v) => set("is_featured", v)} />
              <Field id="sort_order" label="Sort order" help="Lower numbers come first.">
                <input id="sort_order" inputMode="numeric" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} className={cn(FIELD, "w-28")} />
              </Field>
            </Section>
          </form>

          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
            <button type="button" className={RING_BUTTON} onClick={requestClose}>
              Cancel
            </button>
            <button type="submit" form="product-form" className={PRIMARY} disabled={saving || uploading}>
              {saving && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />}
              {product ? "Save changes" : "Add product"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>What you changed in this product won&apos;t be saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onClose();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Section({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <fieldset className={cn("py-4", !last && "border-b border-line-soft")}>
      <legend className="sr-only">{title}</legend>
      <h3 aria-hidden className="mb-3 text-sm font-bold text-ink-muted">
        {title}
      </h3>
      {children}
    </fieldset>
  );
}

function Field({ id, label, help, children }: { id: string; label: React.ReactNode; help?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {help && <span className={HELP}>{help}</span>}
    </div>
  );
}

function ToggleRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="mb-3 flex min-h-11 items-center gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
    </div>
  );
}
