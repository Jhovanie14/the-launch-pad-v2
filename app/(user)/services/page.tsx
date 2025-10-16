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
    switch (category) {
      case "sedan":
        return Wind;
      case "suv":
        return Droplets;
      case "truck":
        return Sparkles;
      default:
        return Wrench;
    }
  };
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance text-blue-900">
            Our Services
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
            Professional car care services tailored to your vehicle's needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const ServiceIcon = getServiceIcon(service.category);
            return (
              <Card
                key={service.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start gap-4 mb-2">
                    <div className="bg-secondary/10 p-3 rounded-lg">
                      <ServiceIcon className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{service.name}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {service.category.toLocaleUpperCase().charAt(0) +
                          service.category.toLocaleLowerCase().slice(1)}
                      </CardDescription>
                    </div>
                  </div>
                  <CardDescription className="text-base leading-relaxed">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-card-foreground mb-2">
                      Features
                    </h4>
                    <div className="flex flex-col gap-2">
                      {service.features?.map((feature, index) => (
                        <p
                          key={index}
                          className="text-sm text-muted-foreground flex items-center"
                        >
                          <Check className="h-3 w-3 mr-1 text-muted-foreground" />
                          {feature}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-2xl font-bold text-primary">
                    ${service.price}
                  </p>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
