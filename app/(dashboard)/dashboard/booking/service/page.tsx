"use client";

import LoadingDots from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import {
  ArrowLeft,
  Car,
  Check,
  Hourglass,
  PackageCheck,
  X,
  Clock,
  Sparkles,
  Loader2Icon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { is } from "zod/v4/locales";

type ServicePackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  features: string[] | null;
  category: string;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type AddOns = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  is_active: boolean;
  created_at: string | null;
};

function ServiceSelectionPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription } = useSubscription();
  const [loading, setLoading] = useState(false);

  const [addOnOpen, setAddOnOpen] = useState(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  const [addOns, setAddOns] = useState<AddOns[]>([]);
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"quick" | "express">("quick");
  const [vehicleSpecs, setVehicleSpecs] = useState<any>({
    license_plate: searchParams.get("license_plate") ?? "",
  });

  // Keep vehicleSpecs in sync with URL search params so the page updates when
  // the booking modal or other parts of the app navigate here with params.
  useEffect(() => {
    const newSpecs = {
      license_plate: searchParams.get("license_plate") ?? "",
    };
    setVehicleSpecs((prev: any) => {
      // Only update state if something changed to avoid unnecessary re-renders
      if (prev.license_plate === newSpecs.license_plate) {
        return prev;
      }
      return newSpecs;
    });

    // If a service was provided in the URL, select it
    const svc = searchParams.get("service");
    if (svc) setSelectedService(svc);
  }, [searchParams]);

  const selectserv = services.find((s) => s.id === selectedService);

  // ============================================
  // HOLIDAY SALE: START - Remove all code between START and END when sale ends
  // ============================================
  const HOLIDAY_SALE_ACTIVE = true; // Set to false when sale ends
  const HOLIDAY_SALE_DISCOUNT = 0.1; // 10% off
  // ============================================
  // HOLIDAY SALE: END
  // ============================================

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Helper functions to determine subscription type
  const isSubscribedToQuickService = () => {
    if (!subscription?.subscription_plans?.name) return false;
    const planName = subscription.subscription_plans.name.toLowerCase();
    return planName.includes("exterior") || planName.includes("quick service");
  };

  const isSubscribedToExpressDetail = () => {
    if (!subscription?.subscription_plans?.name) return false;
    const planName = subscription.subscription_plans.name.toLowerCase();
    return planName.includes("express detail") || planName.includes("express");
  };

  const isServiceFreeForSubscription = (serviceCategory: string) => {
    if (!subscription?.subscription_plans?.name) return false;
    const categoryLower = serviceCategory?.toLowerCase() || "";

    // If subscribed to Quick Service, Quick Service category is free
    if (isSubscribedToQuickService() && categoryLower === "quick service") {
      return true;
    }

    // If subscribed to Express Detail, Express Detail category is free
    if (isSubscribedToExpressDetail() && categoryLower === "express detail") {
      return true;
    }

    return false;
  };

  // Determine which tabs to show based on subscription
  const shouldShowQuickTab = () => {
    if (!subscription?.subscription_plans?.name) return true; // Default: show both if no plan info
    const planName = subscription.subscription_plans.name.toLowerCase();

    // If plan is specifically for express detail, don't show quick tab
    if (planName.includes("express detail") || planName.includes("express")) {
      return false;
    }

    // If plan is for exterior, show quick tab
    if (planName.includes("exterior")) {
      return true;
    }

    // Default: show both tabs if plan doesn't match
    return true;
  };

  const shouldShowExpressTab = () => {
    if (!subscription?.subscription_plans?.name) return true; // Default: show both if no plan info
    const planName = subscription.subscription_plans.name.toLowerCase();

    // If plan is specifically for exterior, don't show express tab
    if (planName.includes("exterior")) {
      return false;
    }

    // If plan is for express detail, show express tab
    if (planName.includes("express detail") || planName.includes("express")) {
      return true;
    }

    // Default: show both tabs if plan doesn't match
    return true;
  };

  // Filter services by category - Quick Service tab shows only quick service category
  const quickServices = services.filter((s) => {
    const categoryLower = s.category?.toLowerCase() || "";
    return categoryLower === "quick service";
  });

  // Filter services by category - Express Detail tab shows only express detail category
  const expressServices = services.filter((s) => {
    const categoryLower = s.category?.toLowerCase() || "";
    return categoryLower === "express detail";
  });

  // Update active tab when subscription changes
  useEffect(() => {
    if (!subscription?.subscription_plans?.name) {
      setActiveTab("quick");
      return;
    }
    const planName = subscription.subscription_plans.name.toLowerCase();

    // If plan name contains "exterior", show Quick Service
    if (planName.includes("exterior")) {
      setActiveTab("quick");
    }
    // If plan name contains "express detail" or "express", show Express Detail
    else if (
      planName.includes("express detail") ||
      planName.includes("express")
    ) {
      setActiveTab("express");
    } else {
      setActiveTab("quick");
    }
  }, [subscription]);

  const handlePackageSelect = (serviceId: string) => {
    setSelectedService(serviceId);

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  const handleContinue = () => {
    if (!selectserv) return;
    setAddOnOpen(true);
  };

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(addOnId)
        ? prev.filter((id) => id !== addOnId)
        : [...prev, addOnId],
    );
  };

  // wire to your next step route
  const goNext = () => {
    // example: push to datetime with params or save in context
    try {
      const params = new URLSearchParams(vehicleSpecs);
      if (selectedService) {
        params.set("service", selectedService);
      }
      if (selectedAddOnIds) {
        params.set("addons", [...selectedAddOnIds].join(","));
      }
      setLoading(true);

      router.push(`/dashboard/booking/datetime?${params.toString()}`);
      setAddOnOpen(false);
    } catch (error) {
      console.log("error", error);
    }
  };

  const skipAddOns = () => {
    try {
      const params = new URLSearchParams(vehicleSpecs);
      if (selectedService) {
        params.set("service", selectedService);
      }
      setLoading(true);
      router.push(`/dashboard/booking/datetime?${params.toString()}`);
      setAddOnOpen(false);
    } catch (error) {
      console.log("error", error);
    }
  };

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_packages")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) console.error(error);

    setServices(data ?? []);
    setLoading(false);
  }, [supabase]);

  const fetchAddOns = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("add_ons")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) console.error(error);

    setAddOns(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPackages();
    fetchAddOns();
  }, [fetchPackages, fetchAddOns]);

  if (loading) {
    return <Loader2Icon />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================
          HOLIDAY SALE: START - Remove this banner when sale ends
          ============================================ */}
      {HOLIDAY_SALE_ACTIVE && (
        <div className="bg-linear-to-r from-red-500 to-red-600 text-white text-center py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span className="text-lg font-bold">
              🎄 HOLIDAY SALE - 5% OFF ALL SERVICES!
            </span>
          </div>
        </div>
      )}
      {/* ============================================
          HOLIDAY SALE: END
          ============================================ */}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              Select Service Package
            </h1>
            <div className="w-16" /> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[800px_1fr] gap-8">
          <div className="space-y-6">
            {/* Tabs for Quick Service and Express Detail */}
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "quick" | "express")
              }
              className="w-full"
            >
              <TabsList
                className={`grid w-full mb-12 ${
                  shouldShowQuickTab() && shouldShowExpressTab()
                    ? "grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                {shouldShowQuickTab() && (
                  <TabsTrigger
                    value="quick"
                    className="flex items-center justify-center gap-2 data-[state=active]:bg-linear-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-blue-50 data-[state=inactive]:border-2 data-[state=inactive]:border-blue-100 rounded-xl transition-all duration-300 py-4 font-bold text-base"
                  >
                    <Clock className="w-5 h-5" />
                    Quick Service
                  </TabsTrigger>
                )}
                {shouldShowExpressTab() && (
                  <TabsTrigger
                    value="express"
                    className="flex items-center justify-center gap-2 data-[state=active]:bg-linear-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-purple-50 data-[state=inactive]:border-2 data-[state=inactive]:border-purple-100 rounded-xl transition-all duration-300 py-4 font-bold text-base"
                  >
                    <Sparkles className="w-5 h-5" />
                    Express Detail
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="quick" className="mt-0">
                {quickServices.length === 0 ? (
                  <div className="text-center text-gray-500 py-10">
                    No Quick Service packages available for your vehicle type.
                  </div>
                ) : (
                  <>
                    {/* ============================================
                        HOLIDAY SALE: START - Remove discount display code when sale ends
                        ============================================ */}
                    {quickServices.map((service) => {
                      const originalPrice = service.price;
                      const salePrice = HOLIDAY_SALE_ACTIVE
                        ? originalPrice * (1 - HOLIDAY_SALE_DISCOUNT)
                        : originalPrice;

                      return (
                        <Card
                          key={service.id}
                          onClick={() => handlePackageSelect(service.id)}
                          className={`relative cursor-pointer transition-all duration-200 hover:shadow-md border-2 mb-4 ${
                            selectedService === service.id
                              ? "border-blue-500 bg-blue-50/50"
                              : "border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          {/* Holiday Sale Badge */}
                          {(() => {
                            const isFree = isServiceFreeForSubscription(
                              service.category || "",
                            );

                            // Show FREE badge if service matches subscription
                            if (isFree) {
                              return (
                                <div className="absolute -top-3 -right-3 z-10">
                                  <div className="bg-green-500 text-white px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
                                    FREE
                                  </div>
                                </div>
                              );
                            }

                            // Show 5% OFF badge if holiday sale is active and service is not free
                            if (HOLIDAY_SALE_ACTIVE) {
                              return (
                                <div className="absolute -top-3 -right-3 z-10">
                                  <div className="bg-linear-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
                                    5% OFF
                                  </div>
                                </div>
                              );
                            }

                            return null;
                          })()}

                          <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full gap-2">
                              <div className="flex-1 min-w-0 space-y-1">
                                <h3 className="text-lg sm:text-base font-semibold text-gray-900 truncate">
                                  {service.name}
                                </h3>
                                <div className="flex items-center space-x-2 text-gray-500 text-sm">
                                  <Hourglass className="w-4 h-4 shrink-0" />
                                  <span>{service.duration} mins</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                {HOLIDAY_SALE_ACTIVE ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm text-gray-500 line-through">
                                      ${originalPrice.toFixed(2)}
                                    </span>
                                    <span className="text-xl sm:text-lg font-bold text-red-600">
                                      ${salePrice.toFixed(2)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xl sm:text-lg font-bold text-gray-900">
                                    ${service.price}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="grid gap-1">
                                {service.features?.map((feature, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center text-sm text-gray-600 min-w-0"
                                  >
                                    <Check className="h-4 w-4 mr-2 text-green-500 shrink-0" />
                                    <span className="truncate">{feature}</span>
                                  </div>
                                ))}
                              </div>
                              {service.description && (
                                <p className="text-sm text-gray-500 pt-2 border-t border-gray-100 truncate">
                                  {service.description}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </>
                )}
              </TabsContent>

              <TabsContent value="express" className="mt-0">
                {expressServices.length === 0 ? (
                  <div className="text-center text-gray-500 py-10">
                    No Express Detail packages available for your vehicle type.
                  </div>
                ) : (
                  <>
                    {/* ============================================
                        HOLIDAY SALE: START - Remove discount display code when sale ends
                        ============================================ */}
                    {expressServices.map((service) => {
                      const originalPrice = service.price;
                      const salePrice = HOLIDAY_SALE_ACTIVE
                        ? originalPrice * (1 - HOLIDAY_SALE_DISCOUNT)
                        : originalPrice;
                      const isFree = isServiceFreeForSubscription(
                        service.category || "",
                      );

                      return (
                        <Card
                          key={service.id}
                          onClick={() => handlePackageSelect(service.id)}
                          className={`relative cursor-pointer transition-all duration-200 hover:shadow-md border-2 mb-4 ${
                            selectedService === service.id
                              ? "border-blue-500 bg-blue-50/50"
                              : "border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          {/* Holiday Sale Badge - only show if not free */}
                          {HOLIDAY_SALE_ACTIVE && !isFree && (
                            <div className="absolute -top-3 -right-3 z-10">
                              <div className="bg-linear-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
                                5% OFF
                              </div>
                            </div>
                          )}

                          {/* FREE Badge for subscribed services */}
                          {isFree && (
                            <div className="absolute -top-3 -right-3 z-10">
                              <div className="bg-green-500 text-white px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
                                FREE
                              </div>
                            </div>
                          )}

                          <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full gap-2">
                              <div className="flex-1 min-w-0 space-y-1">
                                <h3 className="text-lg sm:text-base font-semibold text-gray-900 truncate">
                                  {service.name}
                                </h3>
                                <div className="flex items-center space-x-2 text-gray-500 text-sm">
                                  <Hourglass className="w-4 h-4 shrink-0" />
                                  <span>{service.duration} mins</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                {isFree ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xl sm:text-lg font-bold text-green-600">
                                      FREE
                                    </span>
                                    <span className="text-xs text-gray-500 line-through">
                                      ${service.price.toFixed(2)}
                                    </span>
                                  </div>
                                ) : HOLIDAY_SALE_ACTIVE ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm text-gray-500 line-through">
                                      ${originalPrice.toFixed(2)}
                                    </span>
                                    <span className="text-xl sm:text-lg font-bold text-red-600">
                                      ${salePrice.toFixed(2)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xl sm:text-lg font-bold text-gray-900">
                                    ${service.price}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="grid gap-1">
                                {service.features?.map((feature, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center text-sm text-gray-600 min-w-0"
                                  >
                                    <Check className="h-4 w-4 mr-2 text-green-500 shrink-0" />
                                    <span className="truncate">{feature}</span>
                                  </div>
                                ))}
                              </div>
                              {service.description && (
                                <p className="text-sm text-gray-500 pt-2 border-t border-gray-100 truncate">
                                  {service.description}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* ============================================
                HOLIDAY SALE: END - Remove discount display code when sale ends
                ============================================ */}
            <div
              ref={bottomRef}
              className="flex items-center justify-between border-t p-3 mt-10"
            >
              {selectserv && (
                <>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-accent-foreground">
                      {selectserv.name}
                    </span>
                    {/* ============================================
                        HOLIDAY SALE: START
                        ============================================ */}
                    {(() => {
                      const isFree = isServiceFreeForSubscription(
                        selectserv.category || "",
                      );
                      if (isFree) {
                        return (
                          <div className="flex flex-col">
                            <span className="font-medium text-green-600 text-lg">
                              FREE
                            </span>
                            <span className="text-xs text-gray-500 line-through">
                              ${selectserv.price.toFixed(2)}
                            </span>
                          </div>
                        );
                      }
                      return HOLIDAY_SALE_ACTIVE ? (
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 line-through">
                            ${selectserv.price.toFixed(2)}
                          </span>
                          <span className="font-medium text-red-600">
                            $
                            {(
                              selectserv.price *
                              (1 - HOLIDAY_SALE_DISCOUNT)
                            ).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium text-accent-foreground">
                          ${selectserv.price}
                        </span>
                      );
                    })()}
                    {/* ============================================
                        HOLIDAY SALE: END - Replace above with:
                        <span className="font-medium text-accent-foreground">
                          ${selectserv.price}
                        </span>
                        ============================================ */}
                  </div>

                  <Button
                    onClick={handleContinue}
                    className="bg-blue-900 hover:bg-blue-800"
                  >
                    Continue
                  </Button>
                  {/* add-ons modal */}
                  {addOnOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                          <h2 className="text-2xl font-semibold text-gray-900">
                            Add-ons
                          </h2>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAddOnOpen(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>

                        <div className="overflow-y-auto max-h-96">
                          <div className="divide-y divide-gray-100">
                            {addOns.map((a) => {
                              const isSelected = selectedAddOnIds.includes(
                                a.id,
                              );
                              return (
                                <label
                                  key={a.id}
                                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center space-x-3">
                                      <h4 className="text-2xl font-medium text-black">
                                        {a.name}
                                      </h4>
                                      <p className="text-sm font-semibold text-yellow-500">
                                        {a.duration} (min)
                                      </p>
                                    </div>
                                    <p className="font-light text-black text-sm">
                                      {a.description}
                                    </p>

                                    <p className="text-xl font-semibold text-gray-700">
                                      ${a.price.toFixed(2)}
                                    </p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleAddOn(a.id)}
                                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="border-t border-gray-200 px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {selectserv.name}
                              </h4>
                              {/* ============================================
                                  HOLIDAY SALE: START
                                  ============================================ */}
                              {(() => {
                                const isFree = isServiceFreeForSubscription(
                                  selectserv.category || "",
                                );
                                const servicePrice = isFree
                                  ? 0
                                  : selectserv.price;
                                const addOnsTotal = selectedAddOnIds.reduce(
                                  (sum, id) => {
                                    const addOn = addOns.find(
                                      (a) => a.id === id,
                                    );
                                    if (!addOn) return sum;
                                    let addOnPrice = addOn.price;
                                    if (HOLIDAY_SALE_ACTIVE) {
                                      addOnPrice =
                                        addOnPrice *
                                        (1 - HOLIDAY_SALE_DISCOUNT);
                                    }
                                    return sum + addOnPrice;
                                  },
                                  0,
                                );

                                let finalServicePrice = servicePrice;
                                if (HOLIDAY_SALE_ACTIVE && !isFree) {
                                  finalServicePrice =
                                    servicePrice * (1 - HOLIDAY_SALE_DISCOUNT);
                                }

                                const finalTotal =
                                  finalServicePrice + addOnsTotal;
                                const originalTotal =
                                  selectserv.price +
                                  selectedAddOnIds.reduce((sum, id) => {
                                    const addOn = addOns.find(
                                      (a) => a.id === id,
                                    );
                                    return sum + (addOn?.price || 0);
                                  }, 0);

                                if (isFree && addOnsTotal === 0) {
                                  return (
                                    <div className="flex flex-col">
                                      <p className="text-xl font-bold text-green-600">
                                        FREE
                                      </p>
                                      <span className="text-xs text-gray-500 line-through">
                                        ${originalTotal.toFixed(2)}
                                      </span>
                                    </div>
                                  );
                                }

                                return HOLIDAY_SALE_ACTIVE ? (
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-500 line-through">
                                        ${originalTotal.toFixed(2)}
                                      </span>
                                      <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">
                                        {Math.round(
                                          HOLIDAY_SALE_DISCOUNT * 100,
                                        )}
                                        % OFF
                                      </span>
                                    </div>
                                    <p className="text-xl font-bold text-red-600">
                                      ${finalTotal.toFixed(2)}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-xl font-bold text-gray-900">
                                    ${finalTotal.toFixed(2)}
                                  </p>
                                );
                              })()}
                              {/* ============================================
                                  HOLIDAY SALE: END - Replace above with:
                                  <p className="text-xl font-bold text-gray-900">
                                    ${totalPrice}
                                  </p>
                                  ============================================ */}
                            </div>
                            {selectedAddOnIds.length === 0 ? (
                              <Button
                                variant="outline"
                                onClick={skipAddOns}
                                size="lg"
                              >
                                Skip
                              </Button>
                            ) : (
                              <Button
                                onClick={goNext}
                                size="lg"
                                className="bg-blue-900 hover:bg-blue-800"
                              >
                                Next
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="space-y-4 hidden md:block">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Booking Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-muted-foreground space-x-3">
                  <Car className="w-5 h-5" />
                  <span className="text-sm">Service Package</span>
                </div>
                <div className="ml-2 h-8 w-px bg-gray-300" />
                <div className="flex items-center text-muted-foreground space-x-3">
                  <Hourglass className="w-5 h-5" />
                  <span className="text-sm">Date and Time</span>
                </div>
                <div className="ml-2 h-8 w-px bg-gray-300" />
                <div className="flex items-center text-muted-foreground space-x-3">
                  <PackageCheck className="w-5 h-5" />
                  <span className="text-sm">Confirmation</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServicePage() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <ServiceSelectionPage />
    </Suspense>
  );
}
