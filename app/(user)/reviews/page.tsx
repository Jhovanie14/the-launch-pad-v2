"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/user/footer";
import { UserNavbar } from "@/components/user/navbar";
// import { Review } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { Star, Quote, TrendingUp, Users, Award } from "lucide-react";
import { useEffect, useState } from "react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  bookings: { service_package_name: string }; // array
  profiles: { full_name: string };
}
export default function ReviewsPage() {
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);

  const stats = [
    { label: "Happy Customers", value: "2,500+", icon: Users },
    { label: "Average Rating", value: "4.9/5", icon: Star },
    { label: "Years of Excellence", value: "8+", icon: Award },
    { label: "Customer Retention", value: "95%", icon: TrendingUp },
  ];

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
              full_name
            )`
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log(data);
      setReviews(data || []);
    }
    fetchReview();
  }, [supabase]);

  const companies = [
    "AutoZone",
    "Jiffy Lube",
    "Valvoline",
    "Midas",
    "Firestone",
    "Goodyear",
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold text-foreground text-balance">
                  Hear what our customers say about
                  <span className="text-primary"> The Launch Pad</span>
                </h1>
                <p className="text-xl text-muted-foreground text-pretty">
                  Don't just take our word for it. See why thousands of
                  customers trust us with their vehicles every month.
                </p>
              </div>
              <Button
                size="lg"
                className="bg-blue-900 text-white hover:bg-blue-900/90 text-lg px-8 py-6 rounded-full"
              >
                Book Your Service Today
              </Button>
            </div>

            {/* Right Side - Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <Card
                  key={index}
                  className="border-border bg-card hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6 text-center space-y-2">
                    <stat.icon className="h-8 w-8 text-primary mx-auto" />
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Customer Reviews
            </h2>
            <p className="text-lg text-muted-foreground">
              Real feedback from real customers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {reviews.map((review, index) => (
              <Card
                key={index}
                className="border-border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <Quote className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <p className="text-foreground text-pretty leading-relaxed">
                    "{review.comment}"
                  </p>

                  <div className="space-y-1 pt-2 border-t border-border">
                    <div className="font-semibold text-foreground">
                      {review.profiles?.full_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {review.bookings?.service_package_name ?? "Service"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg text-muted-foreground mb-8">
            Trusted by customers who also choose
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
            {companies.map((company, index) => (
              <div
                key={index}
                className="text-lg font-semibold text-foreground"
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-balance">
            Ready to experience The Launch Pad difference?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto text-pretty">
            Join thousands of satisfied customers who trust us with their
            vehicles. Book your appointment today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6 rounded-full"
            >
              Schedule Service
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 rounded-full border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary bg-transparent"
            >
              View Services
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
