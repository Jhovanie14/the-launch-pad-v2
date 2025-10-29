"use client";

import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Droplets,
  Sparkles,
  Wind,
  Paintbrush,
  Shield,
  Car,
  Gauge,
  Sun,
  Check,
  Wrench,
  Truck,
  CarFront,
  TruckElectric,
} from "lucide-react";
import { useEffect, useState } from "react";
type ServicePackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  features: string[] | null;
  category: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export default function ServicePage() {
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const fetchPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_packages")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setServices(data ?? []);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const getServiceIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "sedan":
        return Car;
      case "compact suv":
      case "suv":
        return CarFront;
      case "truck":
        return TruckElectric;
      case "small truck":
        return Truck;
      case "van":
        return Wrench; // You can choose any icon you prefer for van
      default:
        return Sparkles; // Fallback icon
    }
  };

  const categoryOrder = [
    "sedan",
    "compact suv",
    "suv",
    "small truck",
    "truck",
    "van",
  ];

  const groupedServices = services.reduce<Record<string, ServicePackage[]>>(
    (acc, service) => {
      const cat = service.category.toLowerCase();
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(service);
      return acc;
    },
    {}
  );

  const orderedCategories = Object.entries(groupedServices).sort(
    ([catA], [catB]) => {
      const indexA = categoryOrder.indexOf(catA);
      const indexB = categoryOrder.indexOf(catB);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    }
  );

  const popularServices = "Deluxe wash";

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-blue-900">
            Our Services
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional car care services tailored to your vehicle's needs
          </p>
        </div>

        {/* ✅ Loop through each category */}
        {orderedCategories.map(([category, items]) => (
          <div key={category} className="mb-12">
            {/* Category Label */}
            <h3 className="text-4xl font-semibold mb-10 flex items-center justify-center gap-2 capitalize">
              {(() => {
                const Icon = getServiceIcon(category);
                return <Icon className="h-6 w-6 text-primary" />;
              })()}
              {category}
            </h3>

            {/* Service Cards */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 px-4">
              {items.map((service) => {
                const isPopular = popularServices.includes(service.name);

                return (
                  <Card
                    key={service.id}
                    className={`relative hover:shadow-lg transition-shadow border-border/50 ${
                      isPopular
                        ? "border-yellow-500/50 shadow-xl shadow-yellow-500/20 md:scale-105"
                        : "border-gray-400"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 -right-3 z-10">
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-400 text-slate-900 px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
                          Most Popular
                        </div>
                      </div>
                    )}

                    <CardHeader>
                      <div className="flex items-start gap-4 mb-2">
                        <div className="bg-secondary/10 p-3 rounded-lg">
                          {(() => {
                            const Icon = getServiceIcon(category);
                            return <Icon className="h-6 w-6 text-primary" />;
                          })()}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl font-semibold">
                            {service.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-accent-foreground">
                            {service.duration} mins
                          </CardDescription>
                        </div>
                      </div>
                      <CardDescription className="text-accent-foreground text-lg leading-relaxed">
                        {service.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="space-y-4 mb-6">
                        <h4 className="font-medium text-accent-foreground mb-2">
                          Features
                        </h4>
                        <div className="flex flex-col gap-2">
                          {service.features?.map((feature, index) => (
                            <p
                              key={index}
                              className="text-sm text-accent-foreground flex items-center"
                            >
                              <Check className="h-3 w-3 mr-1 text-primary" />
                              {feature}
                            </p>
                          ))}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter>
                      <p className="text-4xl font-bold text-primary">
                        ${service.price}
                      </p>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
