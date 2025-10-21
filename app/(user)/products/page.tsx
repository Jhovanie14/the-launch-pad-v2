"use client";

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
  SearchIcon,
  ShoppingBasket,
  Star,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

const products = [
  {
    id: "1",
    image: "/carwash.jpg",
    title: "Tire Shine Pro",
    category: "Exterior Care",
    description:
      "Transform your tires with our premium Tire Shine Pro formula. This advanced silicone-based solution provides a deep, long-lasting shine that enhances your vehicle's appearance while protecting against UV damage and cracking. The water-resistant formula ensures your tires maintain their glossy finish through multiple washes. Easy spray-on application makes it perfect for both professional detailers and car enthusiasts. Safe for all tire types including performance, all-season, and specialty tires.",
    tag: [
      "Long-lasting glossy finish",
      "UV protection prevents cracking",
      "Water-resistant formula",
    ],
    rating: 4,
    sale: true,
    reviewCount: 12,
    price: 29.99,
    discountedPrice: 19.99,
    color: "bg-blue-500",
    created_at: "2023-10-01",
    updated_at: "2023-10-05",
  },
  {
    id: "2",
    image: "/carwash.jpg",
    title: "Ceramic Wax Ultimate",
    category: "Interior Care",
    description:
      "Experience the pinnacle of paint protection with our Ceramic Wax Ultimate. This cutting-edge formula combines the benefits of traditional wax with advanced ceramic technology to deliver an unparalleled level of shine and durability. The hydrophobic properties create a strong barrier against water, dirt, and contaminants, making maintenance easier than ever. Suitable for all paint types, this wax enhances color depth and gloss while providing months of protection. Ideal for car enthusiasts who demand the best in automotive care.",
    tag: [
      "Hydrophobic ceramic protection",
      "Enhances paint depth and gloss",
      "Durable for months",
    ],
    rating: 4.8,
    sale: false,
    reviewCount: 8,
    price: 39.99,
    discountedPrice: null,
    color: "bg-green-500",
    created_at: "2023-10-02",
    updated_at: "2023-10-06",
  },
  {
    id: "3",
    image: "/carwash.jpg",
    title: "Ceramic Wax Ultimate",
    category: "Paint Protection",
    description:
      "Our pH-balanced Car Shampoo is designed to provide a thorough yet gentle clean for your vehicle's exterior. This advanced formula effectively removes dirt, grime, and road contaminants without stripping away wax or sealant layers. Infused with gloss enhancers, it leaves a streak-free finish that enhances your car's shine. Safe for all paint types and clear coats, our shampoo is perfect for regular maintenance washes. The biodegradable ingredients ensure an eco-friendly clean that you can feel good about.",
    tag: [
      "Safe for multiple surfaces",
      "pH-balanced, non-streaking formula",
      "Pleasant fresh scent",
    ],
    rating: 4.5,
    sale: true,
    reviewCount: 20,
    price: 24.99,
    discountedPrice: 14.99,
    color: "bg-red-500",
    created_at: "2023-10-03",
    updated_at: "2023-10-07",
  },
  {
    id: "4",
    image: "/carwash.jpg",
    title: "Interior Detailer Max",
    category: "Interior Care",
    description:
      "Revitalize your vehicle's interior with our Interior Detailer Max. This versatile cleaner is specially formulated to tackle a variety of surfaces including leather, vinyl, plastic, and fabric. It effectively removes dust, dirt, and light stains while conditioning and protecting surfaces from UV damage and fading. The non-greasy formula leaves a natural finish without any sticky residue. Infused with a subtle, pleasant scent, it refreshes your car's interior environment. Perfect for quick touch-ups or full interior detailing sessions.",
    tag: [
      "Cleans and protects multiple surfaces",
      "Non-greasy, natural finish",
      "Pleasant scent",
    ],
    rating: 3,
    sale: false,
    reviewCount: 15,
    price: 22.99,
    discountedPrice: null,
    color: "bg-yellow-500",
    created_at: "2023-10-04",
    updated_at: "2023-10-08",
  },
];

function Products() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [sortBy, setSortBy] = useState<string>("latest");
  const [minRating, setMinRating] = useState<number>(0);
  const [filterOpen, setFilterOpen] = useState(false);

  // Get min and max prices
  const minPrice = Math.min(...products.map((p) => p.price));
  const maxPrice = Math.max(...products.map((p) => p.price));

  const categories = ["all", ...new Set(products.map((p) => p.category))];

  useEffect(() => {
    const handler = setTimeout(() => {
      // Debounced search/filter logic can go here if needed
      setDebouncedSearchQuery(searchQuery.trim());
      // console.log("Filtering products...", {
      //   searchQuery,
      //   selectedCategory,
      //   priceRange,
      //   sortBy,
      //   minRating,
      // });
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, selectedCategory, priceRange, sortBy, minRating]);

  const filteredProducts = products
    .filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;
      const matchesSearch = product.title
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase());

      const actualPrice = product.discountedPrice || product.price;
      const matchPrice =
        actualPrice >= priceRange[0] && actualPrice <= priceRange[1];

      const matchRating = product.rating >= minRating;

      return matchesCategory && matchesSearch && matchPrice && matchRating;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return (
            (a.discountedPrice || a.price) - (b.discountedPrice || b.price)
          );
        case "price-high":
          return (
            (b.discountedPrice || b.price) - (a.discountedPrice || a.price)
          );
        case "rating":
          return b.rating - a.rating;
        case "latest":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

  const activeFiltersCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 100 ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (sortBy !== "latest" ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedCategory("all");
    setPriceRange([0, 100]);
    setSortBy("latest");
    setMinRating(0);
    setSearchQuery("");
  };

  return (
    <div className="py-20">
      <div className="max-w-3xl mx-auto text-center mb-16">
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold my-4 text-blue-900">
            Premium Car Care Products
          </h1>
          <p className="text-lg">
            Professional-grade automotive detailing products for enthusiasts who
            demand the best. Transform your vehicle with our carefully curated
            collection. !
          </p>
        </div>
      </div>
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-x-3 space-y-4 sm:space-y-0">
          <div className="relative w-full">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="search products"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center justify-end space-x-2">
            <div className="flex items-center space-x-2 bg-white border p-1 rounded-md">
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
            {/* Filter Popover */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative py-5">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 h-5 w-5 p-0 flex items-center justify-center"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">Filters</h3>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant={"outline"}
                      onClick={clearAllFilters}
                      className="h-8 text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                {/* Category Filter */}
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

                {/* Sort By */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="">
                      <SelectItem value="latest">Latest</SelectItem>
                      <SelectItem value="price-low">
                        Price: Low to High
                      </SelectItem>
                      <SelectItem value="price-high">
                        Price: High to Low
                      </SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </Label>
                  <Slider
                    max={100}
                    step={5}
                    value={priceRange}
                    onValueChange={(value) =>
                      setPriceRange(value as [number, number])
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>${minPrice}</span>
                    <span>${maxPrice}</span>
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Minimum Rating</Label>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((rating) => (
                      <Button
                        key={rating}
                        variant={minRating === rating ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMinRating(rating)}
                        className="flex-1"
                      >
                        {rating === 0 ? (
                          "All"
                        ) : (
                          <div className="flex items-center gap-1">
                            {rating}
                            <Star className="w-3 h-3" />
                          </div>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {products.length} products
          {searchQuery && (
            <span className="ml-2">for &quot;{searchQuery}&quot;</span>
          )}
        </div>
        {/* Product Section */}
        {filteredProducts.length === 0 ? (
          <div>No Boards yet.</div>
        ) : // grid view
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              //   <Link href={`/products/${product.id}`} key={product.id}>
              <Card
                key={product.id}
                className="rounded-xl hover:scale-103 transition-transform duration-200 p-0"
              >
                <div className="relative overflow-hidden rounded-t-lg">
                  {product.sale && (
                    <Badge className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 text-xs z-10">
                      Sale
                    </Badge>
                  )}
                  {product.image ? (
                    <Image
                      height={292}
                      width={450}
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <CardHeader className="flex-1">
                  <CardTitle className="text-sm text-blue-800">
                    {product.category}
                  </CardTitle>
                  <CardDescription className="text-lg text-accent-foreground">
                    {product.title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <span className="text-muted-foreground mb-3 block">
                    {product.description.slice(0, 50)}...
                  </span>
                  <div>
                    {[...Array(5)].map((_, index) => (
                      <Star
                        key={index}
                        className={`inline-block w-4 h-4 rounded-full ${
                          index < product.rating
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">
                      {product.reviewCount} reviews
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {product.discountedPrice ? (
                      <>
                        <span className="text-2xl font-bold text-blue-900">
                          ${product.discountedPrice}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          ${product.price}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-blue-900">
                        ${product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-3">
                  <Button className="w-full bg-blue-800 hover:bg-blue-900">
                    <span className="text-lg dark:text-white">Add to cart</span>
                  </Button>
                </CardFooter>
              </Card>
              //   </Link>
            ))}
          </div>
        ) : (
          // list view
          <div className="space-y-4">
            {filteredProducts.map((product, id) => (
              <div key={id} className={id > 0 ? "mt-4" : "mt-0"}>
                {/* <Link href={`/products/${product.id}`} key={product.id}> */}
                <Card
                  key={id}
                  className="rounded-xl hover:scale-103 transition-transform duration-200 p-0 flex flex-row overflow-hidden"
                >
                  {/* Image on top */}
                  <div className="relative self-center overflow-hidden rounded-lg">
                    {product.sale && (
                      <Badge className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 text-xs z-10">
                        Sale
                      </Badge>
                    )}
                    {product.image ? (
                      <Image
                        height={292}
                        width={450}
                        src={product.image}
                        alt={product.title}
                        className="hidden sm:block w-72 h-auto object-cover rounded-lg p-1"
                      />
                    ) : (
                      <div className="w-full h-auto flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 p-3">
                    <CardHeader className="p-0 pb-3 flex flex-col items-start space-y-1">
                      <div className="flex justify-between w-full items-center">
                        <div>
                          <CardTitle className="text-sm text-blue-800">
                            {product.category}
                          </CardTitle>
                          <CardDescription className="text-lg text-accent-foreground">
                            {product.title}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {product.discountedPrice ? (
                            <>
                              <span className="text-2xl font-bold text-blue-900">
                                ${product.discountedPrice}
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                ${product.price}
                              </span>
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-blue-900">
                              ${product.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            className={`inline-block w-4 h-4 ${
                              index < product.rating
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">
                          {product.reviewCount} reviews
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 space-y-3">
                      <span className="text-muted-foreground mb-3 block">
                        {product.description.slice(0, 100)}...
                      </span>
                      {product.tag && (
                        <div className="flex flex-wrap gap-2">
                          {product.tag.map((tag, idx) => (
                            <Badge
                              key={idx}
                              className="bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-0 mt-5">
                      <Button className=" bg-blue-700 hover:bg-blue-800">
                        <ShoppingBasket className="w-4 h-4" />
                        <span className="text-lg">Add to cart</span>
                      </Button>
                    </CardFooter>
                  </div>
                </Card>
                {/* </Link> */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Products;
