"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import LoadingDots from "@/components/loading";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";
import type { ServicePackageRow } from "@/types/db";
import VehiclePicker from "./VehiclePicker";
import AddOnList from "./AddOnList";
import {
  HOLIDAY_SALE_ACTIVE,
  HOLIDAY_SALE_DISCOUNT,
} from "@/lib/booking/holidaySale";
import { isServiceFreeForDisplay } from "@/lib/booking/pricingDisplay";

export default function ServiceStep({ ctx }: { ctx: BookingAuthContext }) {
  const router = useRouter();
  const {
    selection,
    loading,
    services,
    allAddOns,
    isVehicleSubscribed,
    planName,
    goToDateTime,
  } = useBookingFlow(ctx, "service");

  const [navigating, setNavigating] = useState(false);
  const [addOnOpen, setAddOnOpen] = useState(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(
    selection.serviceId
  );
  const [licensePlate, setLicensePlate] = useState(selection.licensePlate);
  const [showBanner, setShowBanner] = useState(!ctx.isAuthenticated);
  const [activeTab, setActiveTab] = useState<"quick" | "express">("quick");
  const [recommendModalOpen, setRecommendModalOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Keep selection in sync when the URL changes underneath us (e.g. the
  // dashboard booking modal navigates here with params).
  useEffect(() => {
    setLicensePlate(selection.licensePlate);
    if (selection.serviceId) setSelectedService(selection.serviceId);
  }, [selection.licensePlate, selection.serviceId]);

  const selectserv = services.find((s) => s.id === selectedService);

  const isServiceFree = (category: string | null) =>
    isServiceFreeForDisplay({ planName, isVehicleSubscribed, category });

  // Tab gating: a subscribed vehicle only sees the tabs its plan covers.
  const lowerPlan = planName?.toLowerCase() ?? "";
  const showQuickTab =
    !isVehicleSubscribed ||
    !planName ||
    !(
      lowerPlan.includes("express detail") ||
      lowerPlan.includes("express") ||
      lowerPlan.includes("commercial")
    );
  const showExpressTab =
    !isVehicleSubscribed || !planName || !lowerPlan.includes("exterior");

  const quickServices = services.filter(
    (s) => s.category?.toLowerCase() === "quick service"
  );
  const expressServices = services.filter(
    (s) => s.category?.toLowerCase() === "express detail"
  );

  // Auto-select the tab the subscription covers, or the URL-selected service's tab.
  useEffect(() => {
    if (isVehicleSubscribed && planName) {
      const lower = planName.toLowerCase();
      setActiveTab(
        lower.includes("express detail") ||
          lower.includes("express") ||
          lower.includes("commercial")
          ? "express"
          : "quick"
      );
      return;
    }
    if (selection.serviceId && services.length) {
      const svc = services.find((s) => s.id === selection.serviceId);
      const cat = svc?.category?.toLowerCase();
      if (cat === "express detail") setActiveTab("express");
      else if (cat === "quick service") setActiveTab("quick");
    }
  }, [isVehicleSubscribed, planName, selection.serviceId, services]);

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

  const isCompleteService =
    selectserv?.name.toLowerCase().includes("complete") || false;

  const shouldShowRecommendation =
    !isCompleteService && selectedAddOnIds.length >= 3;

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(addOnId)
        ? prev.filter((id) => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  const goNext = (force: boolean = false) => {
    if (!force && shouldShowRecommendation) {
      setRecommendModalOpen(true);
      return;
    }
    setNavigating(true);
    setAddOnOpen(false);
    goToDateTime({
      licensePlate,
      serviceId: selectedService,
      addOnIds: selectedAddOnIds,
    });
  };

  const skipAddOns = () => {
    setNavigating(true);
    setAddOnOpen(false);
    goToDateTime({ licensePlate, serviceId: selectedService, addOnIds: [] });
  };

  const renderServiceCard = (
    service: ServicePackageRow,
    tab: "quick" | "express"
  ) => {
    const originalPrice = Number(service.price);
    const salePrice = HOLIDAY_SALE_ACTIVE
      ? originalPrice * (1 - HOLIDAY_SALE_DISCOUNT)
      : originalPrice;
    const isFree = isServiceFree(service.category);

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
        {/* FREE badge for subscribed services, else holiday sale badge */}
        {isFree ? (
          <div className="absolute -top-3 -right-3 z-10">
            <div className="bg-green-500 text-white px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
              FREE
            </div>
          </div>
        ) : HOLIDAY_SALE_ACTIVE ? (
          <div className="absolute -top-3 -right-3 z-10">
            <div className="bg-linear-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full transform rotate-12 shadow-lg">
              {Math.round(HOLIDAY_SALE_DISCOUNT * 100)}% OFF
            </div>
          </div>
        ) : null}

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
                    ${originalPrice.toFixed(2)}
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
              {service.features?.map((feature, index) =>
                tab === "quick" ? (
                  // Quick tab: "No ..." features get a red X (guest-tree style)
                  <div
                    key={index}
                    className="flex items-center text-xs text-gray-600 min-w-0"
                  >
                    {feature.toLowerCase().includes("no") ? (
                      <X className="h-5 w-5 shrink-0 text-red-400 mx-1" />
                    ) : (
                      <Check className="h-5 w-5 shrink-0 text-yellow-400 mx-1" />
                    )}
                    <span className="text-xs md:base text-slate-800 font-medium">
                      {feature}
                    </span>
                  </div>
                ) : (
                  <div
                    key={index}
                    className="flex items-center text-sm text-gray-600 min-w-0"
                  >
                    <Check className="h-4 w-4 mr-2 text-green-500 shrink-0" />
                    <span className="truncate">{feature}</span>
                  </div>
                )
              )}
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
  };

  if (loading || navigating) {
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
              {Math.round(HOLIDAY_SALE_DISCOUNT * 100)}% OFF ALL SERVICES!
            </span>
          </div>
        </div>
      )}
      {/* ============================================
          HOLIDAY SALE: END
          ============================================ */}

      {!ctx.isAuthenticated && showBanner && (
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
        {!ctx.isAuthenticated && (
          <VehiclePicker
            licensePlate={licensePlate}
            onChange={setLicensePlate}
            onSaved={() =>
              setTimeout(() => {
                bottomRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }, 300)
            }
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[800px_1fr] gap-8">
          <div className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "quick" | "express")
              }
              className="w-full"
            >
              <TabsList
                className={`grid w-full mb-12 ${
                  showQuickTab && showExpressTab ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {showQuickTab && (
                  <TabsTrigger
                    value="quick"
                    className="flex items-center justify-center gap-2 data-[state=active]:bg-linear-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-blue-50 data-[state=inactive]:border-2 data-[state=inactive]:border-blue-100 rounded-xl transition-all duration-300 py-4 font-bold text-base"
                  >
                    <Clock className="w-5 h-5" />
                    Quick Service
                  </TabsTrigger>
                )}
                {showExpressTab && (
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
                  <>{quickServices.map((s) => renderServiceCard(s, "quick"))}</>
                )}
              </TabsContent>

              <TabsContent value="express" className="mt-0">
                {expressServices.length === 0 ? (
                  <div className="text-center text-gray-500 py-10">
                    No Express Detail packages available for your vehicle type.
                  </div>
                ) : (
                  <>
                    {expressServices.map((s) => renderServiceCard(s, "express"))}
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
                    {isServiceFree(selectserv.category) ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-green-600 text-lg">
                          FREE
                        </span>
                        <span className="text-xs text-gray-500 line-through">
                          ${Number(selectserv.price).toFixed(2)}
                        </span>
                      </div>
                    ) : HOLIDAY_SALE_ACTIVE ? (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500 line-through">
                          ${Number(selectserv.price).toFixed(2)}
                        </span>
                        <span className="font-medium text-red-600">
                          $
                          {(
                            Number(selectserv.price) *
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

                  <AddOnList
                    open={addOnOpen}
                    onClose={() => setAddOnOpen(false)}
                    service={selectserv}
                    addOns={allAddOns}
                    selectedIds={selectedAddOnIds}
                    onToggle={toggleAddOn}
                    serviceDisplayPrice={
                      isServiceFree(selectserv.category)
                        ? 0
                        : Number(selectserv.price)
                    }
                    isServiceFree={isServiceFree(selectserv.category)}
                    onSkip={skipAddOns}
                    onNext={() => goNext()}
                  />

                  {recommendModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-3xl max-w-md w-full shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white text-center">
                          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-yellow-300" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">
                            Smart Recommendation
                          </h3>
                          <p className="text-blue-100 text-sm">
                            We noticed you've selected several add-ons!
                          </p>
                        </div>
                        <div className="p-6 space-y-4">
                          <p className="text-gray-700 text-center leading-relaxed">
                            You might get better value by choosing one of our{" "}
                            <span className="font-bold text-blue-900">
                              Complete Detail
                            </span>{" "}
                            packages. They already include most of these
                            features at a bundled price!
                          </p>
                          <div className="space-y-3 pt-2">
                            <Button
                              className="w-full bg-blue-900 hover:bg-blue-800 h-12 rounded-xl text-base font-semibold"
                              onClick={() => {
                                setRecommendModalOpen(false);
                                setAddOnOpen(false);

                                // Find Express Complete Detail or similar
                                const completeService = services.find((s) =>
                                  s.name
                                    .toLowerCase()
                                    .trim()
                                    .includes("express complete")
                                );

                                if (completeService) {
                                  handlePackageSelect(completeService.id);
                                  setActiveTab("express");
                                }

                                // Scroll back up to the express tab contents
                                bottomRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                });
                              }}
                            >
                              Check Complete Detail Plans
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full text-gray-500 hover:text-gray-700 h-10"
                              onClick={() => {
                                setRecommendModalOpen(false);
                                goNext(true); // force go next
                              }}
                            >
                              I'll stick with my current selection
                            </Button>
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
