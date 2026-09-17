"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  ImageOff,
  Loader2,
  Pencil,
  Plus,
  SearchIcon,
  Star,
  Trash2,
  Video,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductStats } from "@/components/admin/product-stats";
import { LOW_STOCK_THRESHOLD } from "@/lib/products/inventory";
import {
  MAX_VIDEO_BYTES,
  VIDEO_MIME_TYPES,
  rejectVideo,
  toGallery,
} from "@/lib/products/media";
import { rejectImage } from "@/lib/products/upload";
import { uniqueSlug } from "@/lib/products/slug";
import type { ProductRow } from "@/types/db";

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  price: "",
  sale_price: "",
  image_url: "",
  video_url: "",
  gallery: [] as string[],
  stock: "0",
  is_active: true,
  is_featured: false,
  sort_order: "0",
};

export default function ProductsView() {
  const supabase = createClient();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  /**
   * Surface what Supabase actually said. A bare "Failed to upload" hides the
   * two causes that matter -- a missing storage policy (row-level security)
   * and a rejected file type or size -- and they need different fixes.
   */
  const uploadFailed = (kind: string, error: unknown) => {
    const detail =
      error instanceof Error ? error.message : String(error ?? "unknown error");
    console.error(`Error uploading product ${kind}:`, error);
    toast.error(`Failed to upload ${kind}: ${detail}`);
  };

  /**
   * Upload via the admin API route rather than the browser storage client.
   *
   * The route authorises with requireAdmin and writes with the service-role
   * key, so uploads no longer depend on the storage.objects RLS policies
   * resolving for the signed-in user -- the failure that surfaced only as
   * "new row violates row-level security policy".
   */
  const uploadTo = async (
    kind: "image" | "gallery" | "video",
    file: File,
  ): Promise<string | null> => {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);

    const res = await fetch("/api/admin/product-media", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
    return data.url ?? null;
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const problem = rejectImage(file);
      if (problem) {
        toast.error(problem);
        return;
      }
      const url = await uploadTo("image", file);
      if (url) setForm((prev) => ({ ...prev, image_url: url }));
    } catch (error) {
      uploadFailed("image", error);
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (file: File) => {
    try {
      setUploading(true);
      const problem = rejectImage(file);
      if (problem) {
        toast.error(problem);
        return;
      }
      const url = await uploadTo("gallery", file);
      if (url) {
        setForm((prev) => ({ ...prev, gallery: [...prev.gallery, url] }));
      }
    } catch (error) {
      uploadFailed("gallery image", error);
    } finally {
      setUploading(false);
    }
  };

  const removeGalleryImage = (url: string) => {
    setForm((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((entry) => entry !== url),
    }));
  };

  const handleVideoUpload = async (file: File) => {
    // The bucket rejects these too; checking here just gives a clearer message.
    const problem = rejectVideo(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      setUploading(true);
      const url = await uploadTo("video", file);
      if (url) setForm((prev) => ({ ...prev, video_url: url }));
    } catch (error) {
      uploadFailed("video", error);
    } finally {
      setUploading(false);
    }
  };

  /** Shared validation + payload for create and update. */
  const buildPayload = () => {
    const price = Number(form.price);
    const stock = Number(form.stock);
    const salePrice = form.sale_price.trim() === "" ? null : Number(form.sale_price);
    if (!form.name.trim() || !form.category.trim()) {
      toast.error("Name and category are required");
      return null;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Price must be a positive number");
      return null;
    }
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0)) {
      toast.error("Sale price must be a positive number");
      return null;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      toast.error("Stock must be a whole number");
      return null;
    }
    const sortOrder = Number(form.sort_order);
    if (!Number.isInteger(sortOrder)) {
      toast.error("Sort order must be a whole number");
      return null;
    }
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim(),
      price,
      sale_price: salePrice,
      image_url: form.image_url || null,
      video_url: form.video_url || null,
      gallery: form.gallery,
      stock,
      is_active: form.is_active,
      is_featured: form.is_featured,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    // Slugs are generated once, at creation, and deliberately never
    // regenerated on edit -- renaming a product must not break links or
    // search results already pointing at it.
    const slug = uniqueSlug(
      payload.name,
      products.map((p) => p.slug),
    );
    const { error } = await supabase
      .from("products")
      .insert([{ ...payload, slug }]);
    if (error) {
      console.error(error);
      // The unique index is the real guard: the slug list above comes from
      // state, which can lag another admin's insert.
      toast.error(
        error.code === "23505"
          ? "A product with a very similar name already exists. Adjust the name and try again."
          : "Failed to create product",
      );
      return;
    }
    toast.success("Product created");
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    fetchProducts();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    const payload = buildPayload();
    if (!payload) return;
    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", editProduct.id);
    if (error) {
      console.error(error);
      toast.error("Failed to update product");
      return;
    }
    toast.success("Product updated");
    setEditProduct(null);
    setForm(EMPTY_FORM);
    fetchProducts();
  };

  const toggleActive = async (product: ProductRow, next: boolean) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq("id", product.id);
    if (error) {
      toast.error("Failed to update product");
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: next } : p)),
    );
  };

  const handleDelete = async (product: ProductRow) => {
    if (
      !window.confirm(
        `Delete "${product.name}" permanently? Deactivating is usually enough — order history keeps its own copy of the name and price either way.`,
      )
    ) {
      return;
    }
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      console.error(error);
      toast.error("Failed to delete product");
      return;
    }
    toast.success("Product deleted");
    fetchProducts();
  };

  const openEdit = (product: ProductRow) => {
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      price: String(product.price),
      sale_price: product.sale_price === null ? "" : String(product.sale_price),
      image_url: product.image_url ?? "",
      video_url: product.video_url ?? "",
      gallery: toGallery(product.gallery),
      stock: String(product.stock),
      is_active: product.is_active,
      is_featured: product.is_featured,
      sort_order: String(product.sort_order),
    });
    setEditProduct(product);
  };

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={form.category}
          onChange={handleChange}
          placeholder="Exterior Care"
          required
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Price ($)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sale_price">Sale price ($, optional)</Label>
        <Input
          id="sale_price"
          type="number"
          step="0.01"
          min="0"
          value={form.sale_price}
          onChange={handleChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stock">Stock</Label>
        <Input
          id="stock"
          type="number"
          step="1"
          min="0"
          value={form.stock}
          onChange={handleChange}
          required
        />
      </div>
      <div className="flex items-center gap-2 pt-6">
        <Switch
          id="is_active"
          checked={form.is_active}
          onCheckedChange={(checked) =>
            setForm((prev) => ({ ...prev, is_active: checked }))
          }
        />
        <Label htmlFor="is_active">Active (visible in the store)</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sort_order">Sort order</Label>
        <Input
          id="sort_order"
          type="number"
          step="1"
          value={form.sort_order}
          onChange={handleChange}
        />
        <p className="text-xs text-muted-foreground">
          Lowest first. Leave at 0 to order by newest.
        </p>
      </div>
      <div className="flex items-start gap-2 pt-6">
        <Switch
          id="is_featured"
          checked={form.is_featured}
          onCheckedChange={(checked) =>
            setForm((prev) => ({ ...prev, is_featured: checked }))
          }
        />
        <div>
          <Label htmlFor="is_featured">Featured</Label>
          <p className="text-xs text-muted-foreground">
            Large video panel on the products page. Keep to 3–6 products.
          </p>
        </div>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="image">Main image</Label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Shown on the product card. Portrait (9:16) suits the grid best.
        </p>
        {form.image_url && (
          <Image
            src={form.image_url}
            alt="Product preview"
            width={120}
            height={80}
            className="rounded-md object-cover"
          />
        )}
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="video">Video</Label>
        <Input
          id="video"
          type="file"
          accept={VIDEO_MIME_TYPES.join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleVideoUpload(file);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Landscape (16:9), silent, 5–10 seconds. MP4 or WebM, under{" "}
          {Math.round(MAX_VIDEO_BYTES / 1_048_576)} MB. Replacing it here
          updates the live page.
        </p>
        {form.video_url && (
          <div className="space-y-2">
            <video
              src={form.video_url}
              muted
              controls
              playsInline
              className="w-full max-w-sm rounded-md"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm((prev) => ({ ...prev, video_url: "" }))}
            >
              Remove video
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="gallery">Gallery images</Label>
        <Input
          id="gallery"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleGalleryUpload(file);
            e.target.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">
          Extra shots for the product page. Add one at a time.
        </p>
        {form.gallery.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.gallery.map((url) => (
              <div key={url} className="relative">
                <Image
                  src={url}
                  alt="Gallery image"
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(url)}
                  aria-label="Remove gallery image"
                  className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow ring-1 ring-border"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploading && (
        <p className="text-sm text-muted-foreground md:col-span-2">Uploading…</p>
      )}
    </>
  );

  const categories = useMemo(
    () => ["all", ...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  /** Products left after the toolbar's search, category and status filters. */
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      if (needle && !product.name.toLowerCase().includes(needle)) return false;
      if (categoryFilter !== "all" && product.category !== categoryFilter) {
        return false;
      }
      switch (statusFilter) {
        case "live":
          return product.is_active;
        case "hidden":
          return !product.is_active;
        case "featured":
          return product.is_featured;
        case "low-stock":
          return product.stock <= LOW_STOCK_THRESHOLD;
        case "needs-content":
          return (
            !product.image_url?.trim() ||
            !product.video_url?.trim() ||
            !product.description?.trim()
          );
        default:
          return true;
      }
    });
  }, [products, search, categoryFilter, statusFilter]);

  const filtersActive =
    search.trim() !== "" || categoryFilter !== "all" || statusFilter !== "all";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" /> Add product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>New product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              {formFields}
              <DialogFooter className="md:col-span-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={uploading}>
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ProductStats products={products} />

      {/* Toolbar. Filters sit in one row above the list so the catalog can be
          narrowed to the thing being worked on -- what is missing a video,
          what is running out -- rather than scanned by eye. */}
      {products.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="admin-product-search"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "all" ? "All categories" : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="low-stock">Low or no stock</SelectItem>
              <SelectItem value="needs-content">Needs content</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Product list */}
      {products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No products yet. Add your first one.
        </p>
      ) : visible.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No products match those filters.</p>
          {filtersActive && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              {product.image_url && (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  width={450}
                  height={200}
                  className="h-40 w-full object-cover"
                />
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-blue-800">{product.category}</p>
                    <CardTitle className="text-base">{product.name}</CardTitle>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {product.is_featured && (
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3" /> Featured
                      </Badge>
                    )}
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {product.sale_price !== null ? (
                    <>
                      <span className="font-bold">
                        ${product.sale_price.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground line-through">
                        ${product.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold">${product.price.toFixed(2)}</span>
                  )}
                  <span
                    className={
                      product.stock === 0
                        ? "ml-auto font-medium text-destructive"
                        : product.stock <= LOW_STOCK_THRESHOLD
                          ? "ml-auto font-medium text-amber-600"
                          : "ml-auto text-muted-foreground"
                    }
                  >
                    {product.stock === 0
                      ? "Out of stock"
                      : `${product.stock} in stock`}
                  </span>
                </div>

                {/* What this product still needs. Only missing items show, so a
                    complete product stays quiet and the gaps stand out. */}
                {(!product.image_url?.trim() ||
                  !product.video_url?.trim() ||
                  !product.description?.trim()) && (
                  <div className="flex flex-wrap gap-1">
                    {!product.image_url?.trim() && (
                      <Badge variant="outline" className="gap-1 text-amber-600">
                        <ImageOff className="h-3 w-3" /> No image
                      </Badge>
                    )}
                    {!product.video_url?.trim() && (
                      <Badge variant="outline" className="gap-1 text-amber-600">
                        <Video className="h-3 w-3" /> No video
                      </Badge>
                    )}
                    {!product.description?.trim() && (
                      <Badge variant="outline" className="gap-1 text-amber-600">
                        <FileText className="h-3 w-3" /> No description
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={(checked) => toggleActive(product, checked)}
                    />
                    <span className="text-xs text-muted-foreground">Visible</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(product)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog (controlled, no trigger) */}
      <Dialog
        open={editProduct !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditProduct(null);
            setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="grid gap-4 md:grid-cols-2">
            {formFields}
            <DialogFooter className="md:col-span-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={uploading}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
