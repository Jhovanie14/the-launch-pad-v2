"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useProductCart } from "@/context/product-cart-context";
import { unitPrice } from "@/lib/products/cart";
import type { ProductRow } from "@/types/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Filter,
  Grid3x3,
  List,
  Loader2,
  SearchIcon,
  ShoppingBasket,
} from "lucide-react";

function AddToCartButton({ product }: { product: ProductRow }) {
  const { add } = useProductCart();
  if (product.stock === 0) {
    return (
      <Button className="w-full" disabled>
        Out of stock
      </Button>
    );
  }
  return (
    <Button
      className="w-full bg-blue-800 hover:bg-blue-900"
      onClick={() => {
        add(product.id, 1, product.stock);
        toast.success(`${product.name} added to cart`);
      }}
    >
      <ShoppingBasket className="mr-2 h-4 w-4" />
      Add to cart
    </Button>
  );
}

function PriceTag({ product }: { product: ProductRow }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold text-blue-900">
        ${unitPrice(product).toFixed(2)}
      </span>
      {product.sale_price !== null && (
        <span className="text-sm text-muted-foreground line-through">
          ${product.price.toFixed(2)}
        </span>
      )}
    </div>
  );
}

export default function Products() {
  const supabase = createClient();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [sliderMax, setSliderMax] = useState(100);
  const [sortBy, setSortBy] = useState<string>("latest");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast.error("Failed to load products");
      }
      const rows = data ?? [];
      setProducts(rows);
      const max = Math.max(100, ...rows.map((p) => Math.ceil(unitPrice(p))));
      setSliderMax(max);
      setPriceRange([0, max]);
      setLoading(false);
    }
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const categories = useMemo(
    () => ["all", ...new Set(products.map((p) => p.category))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesCategory =
          selectedCategory === "all" || product.category === selectedCategory;
        const matchesSearch = product.name
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase());
        const actualPrice = unitPrice(product);
        const matchesPrice =
          actualPrice >= priceRange[0] && actualPrice <= priceRange[1];
        return matchesCategory && matchesSearch && matchesPrice;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price-low":
            return unitPrice(a) - unitPrice(b);
          case "price-high":
            return unitPrice(b) - unitPrice(a);
          case "latest":
          default:
            return (
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        }
      });
  }, [products, selectedCategory, debouncedSearchQuery, priceRange, sortBy]);

  const activeFiltersCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < sliderMax ? 1 : 0) +
    (sortBy !== "latest" ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedCategory("all");
    setPriceRange([0, sliderMax]);
    setSortBy("latest");
    setSearchQuery("");
  };

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </main>
    );
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="py-20">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <div className="space-y-3 text-center">
              <h1 className="my-4 text-5xl font-bold text-blue-900">
                Premium Car Care Products
              </h1>
              <p className="text-lg">
                Professional-grade automotive detailing products for enthusiasts
                who demand the best. Order online for pickup at the store or
                local delivery.
              </p>
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            <div className="mb-4 flex flex-col space-y-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:space-x-3 sm:space-y-0">
              <div className="relative w-full">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="search-products"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center justify-end space-x-2">
                <div className="flex items-center space-x-2 rounded-md border bg-white p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List />
                  </Button>
                </div>
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="relative py-5">
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 flex h-5 w-5 items-center justify-center p-0"
                        >
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 space-y-4" align="end">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Filters</h3>
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="outline"
                          onClick={clearAllFilters}
                          className="h-8 text-xs"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Category</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem
                              key={category}
                              value={category}
                              className="capitalize"
                            >
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sort By</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latest">Latest</SelectItem>
                          <SelectItem value="price-low">
                            Price: Low to High
                          </SelectItem>
                          <SelectItem value="price-high">
                            Price: High to Low
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Price Range: ${priceRange[0]} - ${priceRange[1]}
                      </Label>
                      <Slider
                        max={sliderMax}
                        step={5}
                        value={priceRange}
                        onValueChange={(value) =>
                          setPriceRange(value as [number, number])
                        }
                        className="w-full"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredProducts.length} of {products.length} products
              {searchQuery && (
                <span className="ml-2">for &quot;{searchQuery}&quot;</span>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                {products.length === 0
                  ? "No products available right now — check back soon."
                  : "No products match your filters."}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="rounded-xl p-0 transition-transform duration-200 hover:scale-103"
                  >
                    <div className="relative overflow-hidden rounded-t-lg">
                      {product.sale_price !== null && (
                        <Badge className="absolute left-2 top-2 z-10 bg-green-500 px-2 py-1 text-xs text-white">
                          Sale
                        </Badge>
                      )}
                      {product.image_url ? (
                        <Image
                          height={292}
                          width={450}
                          src={product.image_url}
                          alt={product.name}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-48 w-full items-center justify-center bg-muted text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <CardHeader className="flex-1">
                      <CardTitle className="text-sm text-blue-800">
                        {product.category}
                      </CardTitle>
                      <CardDescription className="text-lg text-accent-foreground">
                        {product.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2">
                      {product.description && (
                        <span className="block text-muted-foreground">
                          {product.description.slice(0, 50)}
                          {product.description.length > 50 ? "…" : ""}
                        </span>
                      )}
                      <PriceTag product={product} />
                    </CardContent>
                    <CardFooter className="p-3">
                      <AddToCartButton product={product} />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="flex flex-row overflow-hidden rounded-xl p-0 transition-transform duration-200 hover:scale-103"
                  >
                    <div className="relative self-center overflow-hidden rounded-lg">
                      {product.sale_price !== null && (
                        <Badge className="absolute left-2 top-2 z-10 bg-green-500 px-2 py-1 text-xs text-white">
                          Sale
                        </Badge>
                      )}
                      {product.image_url ? (
                        <Image
                          height={292}
                          width={450}
                          src={product.image_url}
                          alt={product.name}
                          className="hidden h-auto w-72 rounded-lg object-cover p-1 sm:block"
                        />
                      ) : (
                        <div className="hidden h-40 w-72 items-center justify-center text-muted-foreground sm:flex">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <CardHeader className="flex flex-col items-start space-y-1 p-0 pb-3">
                        <div className="flex w-full items-center justify-between">
                          <div>
                            <CardTitle className="text-sm text-blue-800">
                              {product.category}
                            </CardTitle>
                            <CardDescription className="text-lg text-accent-foreground">
                              {product.name}
                            </CardDescription>
                          </div>
                          <PriceTag product={product} />
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-3 p-0">
                        {product.description && (
                          <span className="block text-muted-foreground">
                            {product.description.slice(0, 100)}
                            {product.description.length > 100 ? "…" : ""}
                          </span>
                        )}
                      </CardContent>
                      <CardFooter className="mt-5 p-0">
                        <div className="w-56">
                          <AddToCartButton product={product} />
                        </div>
                      </CardFooter>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
