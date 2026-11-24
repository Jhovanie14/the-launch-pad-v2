"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, SearchIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  categoriesOf,
  filterProducts,
  priceCeiling,
  shouldShowFilters,
  type SortOption,
} from "@/lib/products/catalog";
import type { ProductRow } from "@/types/db";
import { ProductCard } from "./product-card";
import { FeaturedProduct } from "./featured-product";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT, RING_BUTTON, SURFACE } from "@/components/booking/ui/focus";

/**
 * The browsable half of the storefront.
 *
 * Search and filters only render once the catalog is big enough to need them
 * (see FILTER_THRESHOLD). At launch this is a clean grid with no chrome; by
 * fifty products the controls appear on their own with no code change.
 */
export function ProductCatalog({
  products,
  featured = [],
  id,
  heading,
}: {
  products: ProductRow[];
  /** Curated products, shown first as wide cards. */
  featured?: ProductRow[];
  id: string;
  heading: string;
}) {
  const ceiling = useMemo(() => priceCeiling(products), [products]);
  const categories = useMemo(() => categoriesOf(products), [products]);
  const withControls = shouldShowFilters(products.length);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, ceiling]);
  const [sortBy, setSortBy] = useState<SortOption>("curated");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const visible = useMemo(
    () =>
      filterProducts(products, {
        category,
        search: debouncedSearch,
        priceRange,
        sortBy,
      }),
    [products, category, debouncedSearch, priceRange, sortBy],
  );

  const activeFilters =
    (category !== "all" ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < ceiling ? 1 : 0) +
    (sortBy !== "curated" ? 1 : 0);

  const clearFilters = () => {
    setCategory("all");
    setPriceRange([0, ceiling]);
    setSortBy("curated");
    setSearch("");
  };

  return (
    <section id={id} className="scroll-mt-20 pt-4 pb-16 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {/* Focusable so the hero's "Explore the range" can move focus here. */}
          <h2 tabIndex={-1} className={cn("rounded text-2xl font-black tracking-tight sm:text-3xl", FOCUS_ON_LIGHT)}>
            {heading}
          </h2>

          {withControls && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <SearchIcon aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
                <Input
                  id="search-products"
                  aria-label="Search products"
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 rounded-lg bg-paper pl-10"
                />
              </div>

              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(RING_BUTTON, "relative")}>
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {activeFilters > 0 && (
                      <Badge className="ml-2 flex h-5 w-5 items-center justify-center p-0">
                        {activeFilters}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Filters</p>
                    {activeFilters > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="mr-1 h-3 w-3" /> Clear
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option === "all" ? "All categories" : option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sort">Sort by</Label>
                    <Select
                      value={sortBy}
                      onValueChange={(value) => setSortBy(value as SortOption)}
                    >
                      <SelectTrigger id="sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="curated">Featured order</SelectItem>
                        <SelectItem value="latest">Newest</SelectItem>
                        <SelectItem value="price-low">Price: low to high</SelectItem>
                        <SelectItem value="price-high">Price: high to low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>
                      Price: ${priceRange[0]} – ${priceRange[1]}
                    </Label>
                    <Slider
                      min={0}
                      max={ceiling}
                      step={1}
                      value={priceRange}
                      onValueChange={(value) =>
                        setPriceRange([value[0], value[1]] as [number, number])
                      }
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {visible.length === 0 ? (
          <div className={cn(SURFACE, "mt-6 p-6")}>
            <p className="text-ink-muted">Nothing matches those filters.</p>
            {activeFilters > 0 && (
              <button type="button" onClick={clearFilters} className={cn(RING_BUTTON, "mt-4")}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {featured.map((product) => (
              <li key={product.id} className="col-span-2">
                <FeaturedProduct product={product} />
              </li>
            ))}
            {visible.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
