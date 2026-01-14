"use client";

import LoadingDots from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft,
  Car,
  Check,
  Clock,
  Hourglass,
  PackageCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
  price: number;
  duration: number;
  is_active: boolean;
  created_at: string | null;
};

const BODY_TYPES = [
  "Sedan",
  "Compact Suv",
  "Suvs",
  "Small Truck",
  "Big Truck",
  "Van",
  "Hatchback",
  "Coupe",
  "Convertible",
  "Wagon",
  "Crossover",
  "Minivan",
  "Pickup Truck",
  "Cargo Van",
  "Other",
];

function ServiceSelectionPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const [addOnOpen, setAddOnOpen] = useState(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  const [addOns, setAddOns] = useState<AddOns[]>([]);
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [showVehicleError, setShowVehicleError] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [activeTab, setActiveTab] = useState<"quick" | "express">("quick");

  const selectedServiceParam = searchParams.get("service");

  // Normalize body_type from URL to match BODY_TYPES array
  const normalizeBodyType = (bodyType: string | null): string => {
    if (!bodyType) return "";
    // Try to find a case-insensitive match in BODY_TYPES
    const normalized = BODY_TYPES.find(
      (type) => type.toLowerCase() === bodyType.toLowerCase()
    );
    return normalized || bodyType; // Return matched value or original if no match
  };

  const [vehicleSpecs, setVehicleSpecs] = useState<any>({
    license_plate: searchParams.get("license_plate") ?? "",
  });
  const [selectedService, setSelectedService] = useState<string | null>(
    selectedServiceParam
  );

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const vehicleInfoRef = useRef<HTMLDivElement | null>(null);

  const selectserv = services.find((s) => s.id === selectedService);

  // ============================================
  // HOLIDAY SALE: START - Remove all code between START and END when sale ends
  // ============================================
  const HOLIDAY_SALE_ACTIVE = true; // Set to false when sale ends
  const HOLIDAY_SALE_DISCOUNT = 0.05; // 5% off
  // ============================================
  // HOLIDAY SALE: END
  // ============================================

  // Categories that are NOT dependent on vehicle body_type
  const UNIVERSAL_CATEGORIES = ["quick service", "express detail"];

  // Filter services by category matching body type
  // Services with universal categories are always shown
  const filteredServices = services.filter((s) => {
    const categoryLower = s.category?.toLowerCase() || "";
    const isUniversalCategory = UNIVERSAL_CATEGORIES.includes(categoryLower);

    // Always show universal categories, or show body_type matched services
    return isUniversalCategory;
  });

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
    // Check if selected service requires vehicle info
    const requiresVehicle =
      selectserv &&
      !UNIVERSAL_CATEGORIES.includes(selectserv.category?.toLowerCase() || "");

    if (requiresVehicle) {
      if (!vehicleSpecs.license_plate) {
        toast.error("Please add your vehicle information first.");
        setShowVehicleError(true);
        vehicleInfoRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }
    }

    if (!selectserv) return;
    setAddOnOpen(true);
  };

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(addOnId)
        ? prev.filter((id) => id !== addOnId)
        : [...prev, addOnId]
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

      router.push(`/datetime?${params.toString()}`);
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
      router.push(`/datetime?${params.toString()}`);
      setAddOnOpen(false);
    } catch (error) {
      console.log("error", error);
    }
  };

  const calculateTotal = () => {
    // ============================================
    // HOLIDAY SALE: START
    // ============================================
    let basePrice = selectserv?.price || 0;

    // Apply holiday sale discount
    if (HOLIDAY_SALE_ACTIVE && basePrice > 0) {
      basePrice = basePrice * (1 - HOLIDAY_SALE_DISCOUNT);
    }

    let total = basePrice;
    selectedAddOnIds.forEach((addOnId) => {
      const addOn = addOns.find((a) => a.id === addOnId);
      if (addOn) {
        let addOnPrice = addOn.price;
        // Apply holiday sale to add-ons too
        if (HOLIDAY_SALE_ACTIVE) {
          addOnPrice = addOnPrice * (1 - HOLIDAY_SALE_DISCOUNT);
        }
        total += addOnPrice;
      }
    });
    // ============================================
    // HOLIDAY SALE: END - Replace above with original code:
    // let total = selectserv?.price || 0;
    // selectedAddOnIds.forEach((addOnId) => {
    //   const addOn = addOns.find((a) => a.id === addOnId);
    //   if (addOn) total += addOn.price;
    // });
    // ============================================
    console.log("total price", total);
    return total;
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

  const totalPrice = calculateTotal();

  if (loading) {
    return <LoadingDots />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================
          HOLIDAY SALE: START - Remove this banner when sale ends
          ============================================ */}
      {HOLIDAY_SALE_ACTIVE && (
        <div className="bg-linear-to-r from-red-500 to-red-600 text-white text-center py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span className="text-lg font-bold">5% OFF ALL SERVICES!</span>
          </div>
        </div>
      )}
      {/* ============================================
          HOLIDAY SALE: END
          ============================================ */}

      {showBanner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-linear-to-r from-blue-900 to-blue-800 px-6 py-5 text-white flex items-center justify-between">
              <h2 className="text-lg font-semibold">Join Our Members!</h2>
              <Button
                variant="ghost"
                onClick={() => setShowBanner(false)}
                className="text-blue-100 hover:text-white hover:bg-blue-800/30 w-8 h-8"
              >
                <X className="w-8 h-8" />
              </Button>
            </div>

            <div className="p-6 space-y-4 text-gray-800">
              <p className="text-base font-medium">
                🚗 Register now and enjoy exclusive member benefits:
              </p>

              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <Check className="w-4 h-4 mt-1 text-green-600 mr-2" />
                  Track and manage your bookings easily.
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 mt-1 text-green-600 mr-2" />
                  Access subscription plans for regular savings.
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-green-600 mr-2 shrink-0" />
                  <div>
                    Get <span className="font-semibold">5% OFF </span>
                    on your first booking with promo code{" "}
                    <span className="font-mono bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      WELCOME10
                    </span>
                  </div>
                </li>
              </ul>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => router.push("/signup")}
                  className="bg-blue-900 hover:bg-blue-800 text-white rounded-xl"
                >
                  Create Free Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        {/* Vehicle Info Card */}
        <div ref={vehicleInfoRef} className="mb-6">
          <Card
            className={`mb-6 shadow-sm border ${showVehicleError ? "border-red-500" : "border-gray-200"}`}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Vehicle Information
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {vehicleSpecs.year
                    ? `${vehicleSpecs.year} ${vehicleSpecs.make} ${vehicleSpecs.model} (${vehicleSpecs.color}) - ${vehicleSpecs.body_type}`
                    : "No vehicle information added yet"}
                </p>
              </div>

              <Button
                variant="outline"
                className={`border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white transition-all ${showVehicleError ? "border-red-500 text-red-500 hover:bg-red-500 hover:text-white" : ""}`}
                onClick={() => setVehicleModalOpen(true)}
              >
                {vehicleSpecs.year ? "Edit Vehicle" : "Add Vehicle"}
              </Button>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[800px_1fr] gap-8">
          <div className="space-y-6">
            {filteredServices.length === 0 && (
              <div className="text-center text-gray-500 py-10">
                No services found for your vehicle type.
              </div>
            )}
            {/* ============================================
                HOLIDAY SALE: START - Remove discount display code when sale ends
                ============================================ */}
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "quick" | "express")
              }
              className="w-full"
            >
              <TabsList
                className={`grid w-full mb-12 ${
                  activeTab === "quick" || activeTab === "express"
                    ? "grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                <TabsTrigger
                  value="quick"
                  className="flex items-center justify-center gap-2 data-[state=active]:bg-linear-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-blue-50 data-[state=inactive]:border-2 data-[state=inactive]:border-blue-100 rounded-xl transition-all duration-300 py-4 font-bold text-base"
                >
                  <Clock className="w-5 h-5" />
                  Quick Service
                </TabsTrigger>
                <TabsTrigger
                  value="express"
                  className="flex items-center justify-center gap-2 data-[state=active]:bg-linear-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-purple-50 data-[state=inactive]:border-2 data-[state=inactive]:border-purple-100 rounded-xl transition-all duration-300 py-4 font-bold text-base"
                >
                  <Sparkles className="w-5 h-5" />
                  Express Detail
                </TabsTrigger>
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
                          {HOLIDAY_SALE_ACTIVE && (
                            <div className="absolute -top-3 -right-3 z-10">
                              <div className="bg-linear-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
                                5% OFF
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
                          {HOLIDAY_SALE_ACTIVE && (
                            <div className="absolute -top-3 -right-3 z-10">
                              <div className="bg-linear-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
                                5% OFF
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
            </Tabs>
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
                    {HOLIDAY_SALE_ACTIVE ? (
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
                    )}
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
                                a.id
                              );
                              return (
                                <label
                                  key={a.id}
                                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">
                                      {a.name}
                                    </h4>
                                    <p className="text-lg font-semibold text-gray-700">
                                      ${a.price.toFixed(2)}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-700">
                                      {a.duration} (min)
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
                              {HOLIDAY_SALE_ACTIVE ? (
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500 line-through">
                                      $
                                      {(
                                        selectserv.price +
                                        selectedAddOnIds.reduce((sum, id) => {
                                          const addOn = addOns.find(
                                            (a) => a.id === id
                                          );
                                          return sum + (addOn?.price || 0);
                                        }, 0)
                                      ).toFixed(2)}
                                    </span>
                                    <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">
                                      {Math.round(HOLIDAY_SALE_DISCOUNT * 100)}%
                                      OFF
                                    </span>
                                  </div>
                                  <p className="text-xl font-bold text-red-600">
                                    ${totalPrice.toFixed(2)}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xl font-bold text-gray-900">
                                  ${totalPrice.toFixed(2)}
                                </p>
                              )}
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
            {vehicleModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-900 to-blue-800 text-white">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {vehicleSpecs.year
                          ? "Edit Vehicle Information"
                          : "Add Vehicle Information"}
                      </h2>
                      <p className="text-xs text-blue-100">
                        Your vehicle details help us recommend the right
                        services.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setVehicleModalOpen(false)}
                      className="text-blue-100 hover:text-white hover:bg-blue-800/30"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Form */}
                  <div className="p-6 space-y-6">
                    <div className="">
                      <div className="space-y-2">
                        <Label
                          htmlFor="year"
                          className="text-sm font-medium text-gray-700"
                        >
                          License Plate
                        </Label>
                        <Input
                          id="year"
                          type="text"
                          placeholder="e.g.ABC123"
                          value={vehicleSpecs.license_plate || ""}
                          onChange={(e) =>
                            setVehicleSpecs((prev: any) => ({
                              ...prev,
                              license_plate: e.target.value,
                            }))
                          }
                          className="rounded-lg uppercase text-lg focus-visible:ring-blue-900"
                        />
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 flex items-start space-x-3">
                      <Car className="w-5 h-5 mt-0.5 text-blue-700 shrink-0" />
                      <p>
                        These details ensure accurate service duration and
                        pricing for your specific vehicle type.
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <Button
                      className="bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-2 rounded-xl px-5"
                      onClick={() => {
                        setVehicleModalOpen(false);
                        setShowVehicleError(false);
                        // ✅ Scroll down to next section smoothly after saving
                        setTimeout(() => {
                          bottomRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }, 300); // small delay for modal close animation
                      }}
                    >
                      <Check className="w-4 h-4" />
                      Save Vehicle
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
