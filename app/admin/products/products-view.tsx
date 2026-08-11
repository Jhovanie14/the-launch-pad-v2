"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { ProductRow } from "@/types/db";

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  price: "",
  sale_price: "",
  image_url: "",
  stock: "0",
  is_active: true,
};

export default function ProductsView() {
  const supabase = createClient();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Failed to load products");
    }
    setProducts(data ?? []);
    setLoading(false);
  }, [supabase]);

  const fetchDeliveryFee = useCallback(async () => {
    const { data } = await supabase
      .from("store_settings")
      .select("delivery_fee")
      .eq("id", 1)
      .maybeSingle();
    if (data) setDeliveryFee(String(data.delivery_fee));
  }, [supabase]);

  useEffect(() => {
    fetchProducts();
    fetchDeliveryFee();
  }, [fetchProducts, fetchDeliveryFee]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed.");
        return;
      }
      const fileExt = file.name.split(".").pop();
      const filePath = `products/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);
      if (data?.publicUrl) {
        setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
      }
    } catch (error) {
      console.error("Error uploading product image:", error);
      toast.error("Failed to upload image.");
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
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim(),
      price,
      sale_price: salePrice,
      image_url: form.image_url || null,
      stock,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    const { error } = await supabase.from("products").insert([payload]);
    if (error) {
      console.error(error);
      toast.error("Failed to create product");
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

  const handleSaveFee = async () => {
    const fee = Number(deliveryFee);
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error("Delivery fee must be a positive number");
      return;
    }
    setSavingFee(true);
    const { error } = await supabase
      .from("store_settings")
      .update({ delivery_fee: fee, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSavingFee(false);
    if (error) {
      toast.error("Failed to save delivery fee");
      return;
    }
    toast.success("Delivery fee saved");
  };

  const openEdit = (product: ProductRow) => {
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      price: String(product.price),
      sale_price: product.sale_price === null ? "" : String(product.sale_price),
      image_url: product.image_url ?? "",
      stock: String(product.stock),
      is_active: product.is_active,
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
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="image">Image</Label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
        />
        {uploading && (
          <p className="text-sm text-muted-foreground">Uploading…</p>
        )}
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
    </>
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

      {/* Delivery fee setting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery fee</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="delivery_fee">Flat fee for delivery orders ($)</Label>
            <Input
              id="delivery_fee"
              type="number"
              step="0.01"
              min="0"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={handleSaveFee} disabled={savingFee}>
            {savingFee ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      {/* Product list */}
      {products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No products yet. Add your first one.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
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
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Active" : "Hidden"}
                  </Badge>
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
                        ? "ml-auto font-medium text-red-600"
                        : "ml-auto text-muted-foreground"
                    }
                  >
                    {product.stock === 0
                      ? "Out of stock"
                      : `${product.stock} in stock`}
                  </span>
                </div>
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
