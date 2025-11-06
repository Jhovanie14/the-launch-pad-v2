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
  Sparkles,
  Car,
  Check,
  Wrench,
  Truck,
  CarFront,
  BellElectric as TruckElectric,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useBooking } from "@/context/bookingContext";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const supabase = createClient();
  const { openBookingModal } = useBooking();
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(false);
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
        return Wrench;
      default:
        return Sparkles;
    }
  };

  const categoryOrder = [
    "sedan",
    "compact suv",
    "suvs",
    "small truck",
    "big truck",
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
  const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const popularServices = "Deluxe wash";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: EASE_OUT,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: EASE_OUT,
      },
    },
    hover: {
      y: -8,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-blue-900">
            Our Services
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional car care services tailored to your vehicle's needs
          </p>
        </motion.div>

        {orderedCategories.map(([category, items], categoryIndex) => (
          <motion.div
            key={category}
            className="mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            {/* Category Label */}
            <motion.h3
              className="text-4xl font-semibold mb-10 flex items-center justify-center gap-2 capitalize"
              variants={itemVariants}
            >
              {(() => {
                const Icon = getServiceIcon(category);
                return <Icon className="h-6 w-6 text-primary" />;
              })()}
              {category}
            </motion.h3>

            {/* Service Cards */}
            <motion.div
              className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 px-4"
              variants={containerVariants}
            >
              {items.map((service, index) => {
                const isPopular = popularServices.includes(service.name);

                return (
                  <motion.div
                    key={service.id}
                    onClick={() => {
                      router.push(
                        `/service?service=${service.id}&body_type=${service.category}`
                      );
                    }}
                    variants={cardVariants}
                    whileHover="hover"
                  >
                    <Card
                      className={`relative hover:shadow-lg transition-shadow border-border/50 h-full cursor-pointer ${
                        isPopular
                          ? "border-yellow-500/50 shadow-xl shadow-yellow-500/20 md:scale-105"
                          : "border-gray-400"
                      }`}
                    >
                      {isPopular && (
                        <motion.div
                          className="absolute -top-3 -right-3 z-10"
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            delay: 0.3 + index * 0.1,
                            type: "spring",
                            stiffness: 200,
                          }}
                        >
                          <div className="bg-gradient-to-r from-yellow-400 to-yellow-400 text-slate-900 px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
                            Most Popular
                          </div>
                        </motion.div>
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
                            {service.features?.map((feature, featureIndex) => (
                              <motion.p
                                key={featureIndex}
                                className="text-sm text-accent-foreground flex items-center"
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{
                                  delay: featureIndex * 0.05,
                                  duration: 0.4,
                                }}
                                viewport={{ once: true }}
                              >
                                <Check className="h-3 w-3 mr-1 text-primary" />
                                {feature}
                              </motion.p>
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
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
