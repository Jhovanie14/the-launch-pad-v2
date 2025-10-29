"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Star, Users2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Review } from "@/types";
import { useEffect, useState } from "react";
import { ReviewCarousel } from "./review-carousel";

export default function Customers() {
  const supabase = createClient();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    async function fetchReview() {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `*, 
            bookings (
              service_package_name
            ),
            profiles (
              full_name,
              avatar_url
            )`
        )
        .limit(10)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // console.log(data);
      setReviews(data || []);
    }
    fetchReview();
    // api
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold text-blue-900">
              What Our Customers Say
            </h1>
            <p className="text-xl text-accent-foreground max-w-2xl mx-auto">
              Don't just take our word for it. Hear what our satisfied customers
              have to say about their experience at The Launch Pad.
            </p>
          </div>
        </div>

        <ReviewCarousel reviews={reviews} autoplayInterval={3000} />

        <div className="flex justify-center space-x-2 mt-6">
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index + 1 === current
                  ? "bg-blue-600"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
