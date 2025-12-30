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
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft,
  Car,
  Check,
  Hourglass,
  PackageCheck,
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
  "Hatchback",
  "Coupe",
  "Convertible",
  "Wagon",
  "SUV",
  "Compact SUV",
  "Crossover",
  "Minivan",
  "Van",
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

  const selectedServiceParam = searchParams.get("service");
  const [vehicleSpecs, setVehicleSpecs] = useState<any>({
    year: searchParams.get("year"),
    make: searchParams.get("make"),
    model: searchParams.get("model"),
    body_type: searchParams.get("body_type"),
    color: searchParams.get("color"),
  });
  const [selectedService, setSelectedService] = useState<string | null>(
    selectedServiceParam
  );

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const vehicleInfoRef = useRef<HTMLDivElement | null>(null);

  const selectserv = services.find((s) => s.id === selectedService);

  // const bodyType = (vehicleSpecs.body_type || "").toLowerCase();

  // ============================================
  // HOLIDAY SALE: START - Remove all code between START and END when sale ends
  // ============================================
  const HOLIDAY_SALE_ACTIVE = true; // Set to false when sale ends
  const HOLIDAY_SALE_DISCOUNT = 0.1; // 15% off
  // ============================================
  // HOLIDAY SALE: END
  // ============================================

  // Filter services by category matching body type
  // const filteredServices = services.filter((s) =>
  //   bodyType ? s.category?.toLowerCase() === bodyType : true
  // );

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
    if (
      !vehicleSpecs.year ||
      !vehicleSpecs.make ||
      !vehicleSpecs.model ||
      !vehicleSpecs.color
    ) {
      toast.error("Please add your vehicle information first.");
      setShowVehicleError(true);
      vehicleInfoRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
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
            <span className="text-lg font-bold">
              🎄 HOLIDAY SALE - 10% OFF ALL SERVICES!
            </span>
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
                    Get <span className="font-semibold">10% OFF </span>
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
            {services.length === 0 && (
              <div className="text-center text-gray-500 py-10">
                No services found for your vehicle type.
              </div>
            )}
            {/* ============================================
                HOLIDAY SALE: START - Remove discount display code when sale ends
                ============================================ */}
            {services.map((service) => {
              const originalPrice = service.price;
              const salePrice = HOLIDAY_SALE_ACTIVE
                ? originalPrice * (1 - HOLIDAY_SALE_DISCOUNT)
                : originalPrice;

              return (
                <Card
                  key={service.id}
                  onClick={() => handlePackageSelect(service.id)}
                  className={`relative cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                    selectedService === service.id
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {/* Holiday Sale Badge */}
                  {HOLIDAY_SALE_ACTIVE && (
                    <div className="absolute -top-3 -right-3 z-10">
                      <div className="bg-linear-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
                        10% OFF
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
                  {/* ============================================
                HOLIDAY SALE: END - Replace above with original code:
                {filteredServices.map((service) => (
                  <Card
                    key={service.id}
                    onClick={() => handlePackageSelect(service.id)}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                      selectedService === service.id
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="text-lg sm:text-base font-semibold text-gray-900 truncate">
                            {service.name}
                          </h3>
                          <div className="flex items-center space-x-2 text-gray-500 text-sm">
                            <Hourglass className="w-4 h-4 flex-shrink-0" />
                            <span>{service.duration} mins</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xl sm:text-lg font-bold text-gray-900">
                            ${service.price}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
            {/* ============================================
                HOLIDAY SALE: END - Replace above with original code:
                {filteredServices.map((service) => (
                  <Card
                    key={service.id}
                    onClick={() => handlePackageSelect(service.id)}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                      selectedService === service.id
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="text-lg sm:text-base font-semibold text-gray-900 truncate">
                            {service.name}
                          </h3>
                          <div className="flex items-center space-x-2 text-gray-500 text-sm">
                            <Hourglass className="w-4 h-4 flex-shrink-0" />
                            <span>{service.duration} mins</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xl sm:text-lg font-bold text-gray-900">
                            ${service.price}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                ============================================ */}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label
                          htmlFor="year"
                          className="text-sm font-medium text-gray-700"
                        >
                          Year
                        </Label>
                        <Input
                          id="year"
                          type="number"
                          placeholder="e.g. 2020"
                          value={vehicleSpecs.year || ""}
                          onChange={(e) =>
                            setVehicleSpecs((prev: any) => ({
                              ...prev,
                              year: e.target.value,
                            }))
                          }
                          className="rounded focus-visible:ring-blue-900"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="make"
                          className="text-sm font-medium text-gray-700"
                        >
                          Make
                        </Label>
                        <Input
                          id="make"
                          type="text"
                          placeholder="e.g. Toyota"
                          value={vehicleSpecs.make || ""}
                          onChange={(e) =>
                            setVehicleSpecs((prev: any) => ({
                              ...prev,
                              make: e.target.value,
                            }))
                          }
                          className="rounded focus-visible:ring-blue-900"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="model"
                          className="text-sm font-medium text-gray-700"
                        >
                          Model
                        </Label>
                        <Input
                          id="model"
                          type="text"
                          placeholder="e.g. Camry"
                          value={vehicleSpecs.model || ""}
                          onChange={(e) =>
                            setVehicleSpecs((prev: any) => ({
                              ...prev,
                              model: e.target.value,
                            }))
                          }
                          className="rounded focus-visible:ring-blue-900"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="color"
                          className="text-sm font-medium text-gray-700"
                        >
                          Color
                        </Label>
                        <Input
                          id="color"
                          type="text"
                          placeholder="e.g. Black"
                          value={vehicleSpecs.color || ""}
                          onChange={(e) =>
                            setVehicleSpecs((prev: any) => ({
                              ...prev,
                              color: e.target.value,
                            }))
                          }
                          className="rounded focus-visible:ring-blue-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="color"
                          className="text-sm font-medium text-gray-700"
                        >
                          Body Type
                        </Label>
                        <Select
                          value={vehicleSpecs.body_type}
                          onValueChange={(val) =>
                            setVehicleSpecs((prev: any) => ({
                              ...prev,
                              body_type: val,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Body Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {BODY_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
