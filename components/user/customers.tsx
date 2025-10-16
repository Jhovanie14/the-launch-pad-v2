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
const customers = [
  {
    image: Users2,
    name: "Emily Rodriguez",
    bio: "Car Enthusiast",
    rating: 5,
    comment:
      "The subscription service is worth every penny. My car always looks amazing, and the team treats it like their own.",
  },
  {
    image: Users2,
    name: "Michael Chen",
    bio: "Car Owner",
    rating: 5,
    comment:
      "The attention to detail is incredible. Their ceramic coating service has made maintaining my Model 3 so much easier. Highly recommended!",
  },
  {
    image: Users2,
    name: "Sarah Collins",
    bio: "Subscriber",
    rating: 5,
    comment:
      "I've tried many car washes in Houston, but The Launch Pad is truly in another galaxy! The Galaxy Premium wash keeps my BMW looking showroom-new.",
  },
  {
    image: Users2,
    name: "James Wilson",
    bio: "Regular Customer",
    rating: 5,
    comment:
      "Outstanding service every time. The team's expertise and professionalism are unmatched in Houston.",
  },
];

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
      console.log(data);
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
  }, [api, supabase]);

  return (
    <div className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-semibold text-blue-900">
              What Our Customers Say
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Don't just take our word for it. Hear what our satisfied customers
              have to say about their experience at The Launch Pad.
            </p>
          </div>
        </div>
        <div className="relative">
          <Carousel setApi={setApi} className="w-full max-w-3xl mx-auto">
            <CarouselContent>
              {reviews.map((customer, index) => (
                <CarouselItem key={index}>
                  <div className="p-1">
                    <Card>
                      <CardContent>
                        <div className="flex flex-col items-center space-y-3">
                          {/* <customer.profiles className="w-12 h-12 object-contain" /> */}
                          <span className="text-lg font-medium text-foreground">
                            {customer.profiles.full_name}
                          </span>
                          <span className="text-blue-900">
                            {/* {customer?.profiles?.bio ?? "Customer"} */}
                            {customer.bookings.service_package_name}
                          </span>
                          <div className="flex space-x-1">
                            {Array.from({ length: customer.rating }, (_, i) => (
                              <Star
                                key={i}
                                className="w-4 h-4 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>
                          <span className="text-lg text-center text-muted-foreground">
                            "{customer.comment}"
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border-2 border-gray-300 hover:bg-gray-50 shadow-lg z-10" />
            <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border-2 border-gray-300 hover:bg-gray-50 shadow-lg z-10" />
          </Carousel>
        </div>
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
