"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Car,
  CheckCircle2,
  CreditCard,
  Crown,
  PackageCheck,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createBooking } from "../action";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import LoadingDots from "@/components/loading";

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [vehicleSpecs] = useState<any>({
    license_plate: searchParams.get("license_plate"),
  });
  const [selectedPackages, setSelectedPackages] = useState<any>(null);
  const [userSubscribe, setUserSubscribe] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const serviceId = searchParams.get("service");
  const addonsParam = searchParams.get("addons");

  const [appointmentDate, setAppointmentDate] = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);

  // ============================================
  // HOLIDAY SALE: START - Remove all code between START and END when sale ends
  // ============================================
  const HOLIDAY_SALE_ACTIVE = true; // Set to false when sale ends
  const HOLIDAY_SALE_DISCOUNT = 0.1; // 10% off
  // ============================================
  // HOLIDAY SALE: END
  // ============================================

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

  const dateParam = searchParams.get("date");
  const timeParam = searchParams.get("time");

  const isSubscribed = !!userSubscribe?.stripe_subscription_id;

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("user_subscription")
        .select(
          `
          stripe_customer_id,
          stripe_subscription_id,
          subscription_plan:subscription_plans (
            name,
            description,
            monthly_price,
            yearly_price
          )
        `
        )
        .eq("user_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.error("❌ Error fetching subscription:", error);
      } else {
        // console.log("✅ Subscription data:", data);
        setUserSubscribe(data);
        // Set full subscription data for category checking
        if (data) {
          setSubscription({
            subscription_plans: data.subscription_plan,
          });
        }
      }

      if (serviceId) {
        const { data } = await supabase
          .from("service_packages")
          .select("*")
          .eq("id", serviceId)
          .single();

        setSelectedPackages(data);
      }

      if (addonsParam) {
        const addonIds = addonsParam.split(",").filter(Boolean);
        if (addonIds.length > 0) {
          const { data, error } = await supabase
            .from("add_ons")
            .select("*")
            .in("id", addonIds); // ✅ handle multiple add-ons
          if (error) console.error(error);
          else setSelectedAddOns(data);
          // console.log("add ons ids", data);
        }
      }
      if (dateParam) {
        setAppointmentDate(dateParam);
      }

      if (timeParam) {
        setAppointmentTime(timeParam);
      }
    })();
  }, [serviceId, addonsParam, dateParam, timeParam, supabase, user?.id]);

  async function validatePromoCode() {
    if (!promoCode) return;

    const { data, error } = await supabase
      .from("promo_codes")
      .select("discount_percent, is_active, applies_to")
      .ilike("code", promoCode.trim())
      .maybeSingle();

    // console.log("Promo code data:", data, error);

    if (error || !data) {
      toast.error("Invalid promo code");
      return;
    }
    if (!data.is_active) {
      toast.error("This promo code is not active");
      return;
    }

    if (data.applies_to !== "one_time" && data.applies_to !== "both") {
      toast.error("This promo code cannot be used for one-time bookings");
      return;
    }

    setDiscountPercent(data.discount_percent);
    toast.success(`Promo applied! ${data.discount_percent}% off your total`);
  }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("promo_codes").select("*");
      console.log("🔍 All promo codes:", data, error);
    })();
  }, [supabase]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateDuration = () => {
    const base = Number(selectedPackages?.duration) || 0;
    const addOnsTotal = Array.isArray(selectedAddOns)
      ? selectedAddOns.reduce(
          (sum: number, addOn: any) => sum + Number(addOn.duration),
          0
        )
      : 0;

    return base + addOnsTotal;
  };

  const calculateTotal = () => {
    // ============================================
    // HOLIDAY SALE: START
    // ============================================
    const addOnsTotal = Array.isArray(selectedAddOns)
      ? selectedAddOns.reduce((sum: number, addOn: any) => {
          let price = Number(addOn.price);
          // Apply holiday sale to add-ons
          if (HOLIDAY_SALE_ACTIVE) {
            price = price * (1 - HOLIDAY_SALE_DISCOUNT);
          }
          return sum + price;
        }, 0)
      : 0;

    // Check if service is free for subscription
    const serviceCategory = selectedPackages?.category || "";
    const isServiceFree = isServiceFreeForSubscription(serviceCategory);

    // If subscribed and service matches subscription category, service is free
    if (isServiceFree) {
      return addOnsTotal;
    }

    // If subscribed but service doesn't match, charge full price
    let basePrice = Number(selectedPackages?.price) || 0;
    // Apply holiday sale to base price (only if not free)
    if (HOLIDAY_SALE_ACTIVE && basePrice > 0) {
      basePrice = basePrice * (1 - HOLIDAY_SALE_DISCOUNT);
    }
    return basePrice + addOnsTotal;
    // ============================================
    // HOLIDAY SALE: END - Replace above with original code:
    // const addOnsTotal = Array.isArray(selectedAddOns)
    //   ? selectedAddOns.reduce(
    //       (sum: number, addOn: any) => sum + Number(addOn.price),
    //       0
    //     )
    //   : 0;
    // if (isSubscribed) return addOnsTotal;
    // const basePrice = Number(selectedPackages?.price) || 0;
    // return basePrice + addOnsTotal;
    // ============================================
  };

  // ============================================
  // HOLIDAY SALE: START - Remove this function when sale ends
  // ============================================
  // Calculate original price before any discounts (for display)
  const calculateOriginalTotal = () => {
    const addOnsTotal = Array.isArray(selectedAddOns)
      ? selectedAddOns.reduce(
          (sum: number, addOn: any) => sum + Number(addOn.price),
          0
        )
      : 0;

    // Check if service is free for subscription
    const serviceCategory = selectedPackages?.category || "";
    const isServiceFree = isServiceFreeForSubscription(serviceCategory);

    // If service is free, only return add-ons total
    if (isServiceFree) {
      return addOnsTotal;
    }

    const basePrice = Number(selectedPackages?.price) || 0;
    return basePrice + addOnsTotal;
  };
  // ============================================
  // HOLIDAY SALE: END
  // ============================================

  const calculateTotalWithPromo = () => {
    const total = calculateTotal();
    // Apply promo code discount on top of holiday sale (if any)
    return discountPercent > 0
      ? total - (total * discountPercent) / 100
      : total;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const handleConfirmBooking = async () => {
    const isSubscribed = !!userSubscribe?.stripe_subscription_id;
    const serviceCategory = selectedPackages?.category || "";
    const isServiceFree = isServiceFreeForSubscription(serviceCategory);

    // If subscribed, service matches subscription, and no add-ons → book directly (free)
    if (
      isSubscribed &&
      isServiceFree &&
      (!selectedAddOns || selectedAddOns.length === 0)
    ) {
      setIsSubmitting(true);
      try {
        const booking = await createBooking({
          license_plate: vehicleSpecs.license_plate ?? "",
          servicePackage: { ...selectedPackages, price: 0 },
          addOnsId: [],
          appointmentDate: new Date(appointmentDate!),
          appointmentTime: appointmentTime!.toString(),
          totalPrice: 0,
          totalDuration: calculateDuration(),
          payment_method: "subscription",
        });
        window.location.href = `/dashboard/bookings/success?booking_id=${booking.id}`;
      } catch (error) {
        console.error("Booking failed:", error);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Otherwise → show payment choice modal
    setShowPaymentModal(true);
  };

  const confirmPaymentChoice = async () => {
    try {
      setIsSubmitting(true);
      setShowPaymentModal(false);

      // ============================================
      // HOLIDAY SALE: START
      // ============================================
      // Note: total calculation is handled in calculateTotal() with holiday sale
      const totalWithDiscount = Number(calculateTotalWithPromo().toFixed(2));
      // ============================================
      // HOLIDAY SALE: END
      // ============================================

      // Check if service is free for subscription
      const serviceCategory = selectedPackages?.category || "";
      const isServiceFree = isServiceFreeForSubscription(serviceCategory);
      const servicePrice = isServiceFree ? 0 : selectedPackages!.price;

      if (paymentMethod === "cash") {
        const booking = await createBooking({
          license_plate: vehicleSpecs.license_plate ?? "",

          servicePackage: { ...selectedPackages, price: servicePrice },
          addOnsId: selectedAddOns
            ? selectedAddOns.map((a: { id: string }) => a.id)
            : [],
          appointmentDate: new Date(appointmentDate!),
          appointmentTime: appointmentTime!.toString(),
          totalPrice: totalWithDiscount,
          totalDuration: calculateDuration(),
          payment_method: "cash",
        });
        window.location.href = `/dashboard/bookings/success?booking_id=${booking.id}`;
        return;
      } else {
        // Card payment (via Stripe)
        const payload = {
          vehicleSpecs,
          servicePackageId: selectedPackages!.id,
          servicePackageName: selectedPackages!.name,
          servicePackagePrice: servicePrice, // Free if matches subscription, otherwise full price
          addOns:
            selectedAddOns?.map(
              (a: { id: string; name: string; price: number }) => ({
                id: a.id,
                name: a.name,
                price: a.price,
              })
            ) ?? [],
          appointmentDate: appointmentDate,
          appointmentTime: appointmentTime!.toString(),
          totalPrice: totalWithDiscount,
          totalDuration: calculateDuration(),
          payment_method: "card",
        };

        const res = await fetch("/api/checkout_sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceCategory = selectedPackages?.category || "";
  const isServiceFree = isServiceFreeForSubscription(serviceCategory);
  const isFreeForSubscriber =
    isSubscribed &&
    isServiceFree &&
    (!selectedAddOns || selectedAddOns.length === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
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
              Confirm Your Booking
            </h1>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className=" space-y-6">
            {/* Vehicle Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Car className="w-5 h-5 mr-2" />
                  Vehicle Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* <div className="flex justify-between">
                    <span className="text-gray-600">Year:</span>
                    <span className="font-medium">{vehicleSpecs.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Make:</span>
                    <span className="font-medium">{vehicleSpecs.make}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-medium">{vehicleSpecs.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Body Type:</span>
                    <span className="font-medium">
                      {vehicleSpecs.body_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Color:</span>
                    <span className="font-medium">{vehicleSpecs.color}</span>
                  </div> */}
                  <div className="flex justify-between">
                    <span className="text-slate-900 font-medium">
                      License Plate:
                    </span>
                    <span className="font-medium">
                      {vehicleSpecs.license_plate || "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-800 font-medium">Date:</span>
                    <span className="font-medium">
                      {appointmentDate && formatDate(appointmentDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-800 font-medium">Time:</span>
                    {appointmentTime && (
                      <span className="font-medium">
                        {formatTime(appointmentTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-800 font-medium">Service:</span>
                    <span className="font-medium">
                      {selectedPackages?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="pl-4 text-xs text-gray-600">
                      - Duration:
                    </span>
                    <span className="font-medium">
                      {Number(selectedPackages?.duration)} mins
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-800 font-medium">Add Ons:</span>
                    {Array.isArray(selectedAddOns) &&
                    selectedAddOns.length > 0 ? (
                      selectedAddOns.map((addon: any) => (
                        <div
                          key={addon.id}
                          className="flex justify-between pl-4 text-sm text-gray-600"
                        >
                          <span>{addon.name}</span>
                          <span>{addon.duration} mins</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between pl-4 text-sm text-gray-500">
                        <span className="font-medium">None</span>
                        <span className="font-medium">0</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-800 font-medium">
                      Whole Duration:
                    </span>
                    <span className="font-medium">
                      {calculateDuration()} minutes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-800 font-medium">
                      Total Price:
                    </span>
                    {/* ============================================
                        HOLIDAY SALE: START
                        ============================================ */}
                    <div className="flex flex-col items-end">
                      {HOLIDAY_SALE_ACTIVE && (
                        <span className="text-sm text-gray-500 line-through">
                          ${calculateOriginalTotal().toFixed(2)}
                        </span>
                      )}
                      <span className="font-medium">
                        $
                        {discountPercent > 0
                          ? calculateTotalWithPromo().toFixed(2)
                          : calculateTotal().toFixed(2)}
                      </span>
                    </div>
                    {/* ============================================
                        HOLIDAY SALE: END - Replace above with:
                        <span className="font-medium">
                          $
                          {discountPercent > 0
                            ? calculateTotalWithPromo().toFixed(2)
                            : calculateTotal()}
                        </span>
                        ============================================ */}
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* ============================================
                HOLIDAY SALE: START - Remove this badge when sale ends
                ============================================ */}
            {HOLIDAY_SALE_ACTIVE && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="bg-linear-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full">
                  🎄 HOLIDAY SALE
                </div>
                <p className="text-sm text-red-700 font-semibold">
                  10% OFF Applied! Save $
                  {(calculateOriginalTotal() - calculateTotal()).toFixed(2)}
                </p>
              </div>
            )}
            {/* ============================================
                HOLIDAY SALE: END
                ============================================ */}
            {(() => {
              const serviceCategory = selectedPackages?.category || "";
              const isServiceFree =
                isServiceFreeForSubscription(serviceCategory);

              if (isServiceFree) {
                return (
                  <div className="flex items-center gap-1">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <p className="text-sm text-green-600">
                      You're subscribed to{" "}
                      {isSubscribedToQuickService()
                        ? "Quick Service"
                        : "Express Detail"}{" "}
                      — this service is free! You only pay for add-ons.
                    </p>
                  </div>
                );
              } else if (isSubscribed) {
                return (
                  <div className="flex items-center gap-1">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <p className="text-sm text-orange-600">
                      You're subscribed to{" "}
                      {isSubscribedToQuickService()
                        ? "Quick Service"
                        : "Express Detail"}{" "}
                      — this{" "}
                      {serviceCategory === "quick service"
                        ? "Quick Service"
                        : "Express Detail"}{" "}
                      service requires payment.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            {discountPercent > 0 && (
              <p className="text-green-600 text-sm mt-2">
                Promo applied: {discountPercent}% off — New Total: $
                {calculateTotalWithPromo().toFixed(2)}
              </p>
            )}
            {isFreeForSubscriber && (
              <p className="text-sm text-gray-500 mt-1">
                Promo codes are not applicable — your wash is free under your
                subscription.
              </p>
            )}
            <div className="w-full md:flex space-y-3 md:space-y-0 items-center md:justify-between">
              {/* Promo code */}
              <div className="flex justify-between items-center gap-1">
                <Label className="text-accent-foreground" id="promoCode">
                  Promo Code:
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="promoCode"
                    type="text"
                    placeholder="Enter promo code"
                    className="w-48"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="border-blue-900"
                    disabled={!promoCode || isFreeForSubscriber}
                    onClick={validatePromoCode}
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <Button
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="bg-blue-900 hover:bg-blue-800 px-8 py-3"
              >
                {isSubmitting && <Loader2 />}
                {isSubmitting ? "Redirecting..." : "Proceed to Payment"}
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Booking Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-muted-foreground space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm">Service Package Selected</span>
                </div>
                <div className="ml-2 h-8 w-px bg-gray-300" />
                <div className="flex items-center text-muted-foreground space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm">Date and Time</span>
                </div>
                <div className="ml-2 h-8 w-px bg-gray-300" />
                <div className="flex items-center text-primary space-x-3">
                  <PackageCheck className="w-5 h-5" />
                  <span className="text-sm">Confirmation</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AlertDialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Choose Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Please select how you’d like to pay for your booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Pay with Card */}
            <label
              className={`flex items-center justify-center gap-1 p-2 border rounded-2xl cursor-pointer transition-all ${
                paymentMethod === "card"
                  ? "border-blue-600 bg-blue-50 shadow-sm"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="card"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
                className="hidden"
              />
              <CreditCard
                className={`w-6 h-6 ${
                  paymentMethod === "card" ? "text-blue-600" : "text-gray-500"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  paymentMethod === "card" ? "text-blue-700" : "text-gray-700"
                }`}
              >
                Pay with Card
              </span>
            </label>

            {/* Pay with Cash */}
            <label
              className={`flex items-center justify-center gap-1 p-2 border rounded-2xl cursor-pointer transition-all ${
                paymentMethod === "cash"
                  ? "border-green-600 bg-green-50 shadow-sm"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="cash"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
                className="hidden"
              />
              <Banknote
                className={`w-6 h-6 ${
                  paymentMethod === "cash" ? "text-green-600" : "text-gray-500"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  paymentMethod === "cash" ? "text-green-700" : "text-gray-700"
                }`}
              >
                Pay with Cash
              </span>
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-900 hover:bg-blue-800"
              onClick={confirmPaymentChoice}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <ConfirmationContent />
    </Suspense>
  );
}
