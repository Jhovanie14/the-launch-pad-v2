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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createBooking } from "../action";

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [vehicleSpecs, setVehicleSpecs] = useState<any>({
    year: searchParams.get("year"),
    make: searchParams.get("make"),
    model: searchParams.get("model"),
    body_type: searchParams.get("body_type"),
    color: searchParams.get("color"),
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

  const dateParam = searchParams.get("date");
  const timeParam = searchParams.get("time");

  const isSubscribed = !!userSubscribe?.stripe_subscription_id;

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("user_subscription")
        .select("stripe_customer_id,stripe_subscription_id")
        .eq("user_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.error("❌ Error fetching subscription:", error);
      } else {
        console.log("✅ Subscription data:", data);
        setUserSubscribe(data);
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
    const addOnsTotal = Array.isArray(selectedAddOns)
      ? selectedAddOns.reduce(
          (sum: number, addOn: any) => sum + Number(addOn.price),
          0
        )
      : 0;

    if (isSubscribed) return addOnsTotal;

    const basePrice = Number(selectedPackages?.price) || 0;
    return basePrice + addOnsTotal;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const handleConfirmBooking = async () => {
    const isSubscribed = !!userSubscribe?.stripe_subscription_id;

    // If subscribed and no add-ons → book directly (free)
    if (isSubscribed && !selectedAddOns) {
      setIsSubmitting(true);
      try {
        const booking = await createBooking({
          year: parseInt(vehicleSpecs.year || "0"),
          make: vehicleSpecs.make || "",
          model: vehicleSpecs.model || "",
          body_type: vehicleSpecs.body_type || "",
          colors: [vehicleSpecs.color || ""],
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

      const addOnsTotal = Array.isArray(selectedAddOns)
        ? selectedAddOns.reduce((sum, a) => sum + Number(a.price), 0)
        : 0;

      if (paymentMethod === "cash") {
        const booking = await createBooking({
          year: parseInt(vehicleSpecs.year || "0"),
          make: vehicleSpecs.make || "",
          model: vehicleSpecs.model || "",
          body_type: vehicleSpecs.body_type || "",
          colors: [vehicleSpecs.color || ""],
          servicePackage: { ...selectedPackages },
          addOnsId: selectedAddOns
            ? selectedAddOns.map((a: { id: string }) => a.id)
            : [],

          appointmentDate: new Date(appointmentDate!),
          appointmentTime: appointmentTime!.toString(),
          totalPrice: calculateTotal(),
          totalDuration: calculateDuration(),
          payment_method: "cash",
        });
        window.location.href = `/dashboard/bookings/success?booking_id=${booking.id}`;
        return;
      }

      // Card payment (via Stripe)
      const payload = {
        year: parseInt(vehicleSpecs.year || "0"),
        make: vehicleSpecs.make || "",
        model: vehicleSpecs.model || "",
        body_type: vehicleSpecs.body_type || "",
        colors: [vehicleSpecs.color || ""],
        vehicleSpecs,
        servicePackageId: selectedPackages!.id,
        servicePackageName: selectedPackages!.name,
        servicePackagePrice: isSubscribed ? 0 : selectedPackages!.price, // 👈 zero if subscribed
        addOnsId: selectedAddOns
          ? selectedAddOns.map((a: { id: string }) => a.id)
          : [],
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime!.toString(),
        totalPrice: isSubscribed ? addOnsTotal : calculateTotal(),
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
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      {/* {userSubscribe && (
        <Card className="mt-10">
          <CardHeader>
            <CardTitle>User Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Customer ID: {userSubscribe.stripe_customer_id}</p>
            <p>Subscription ID: {userSubscribe.stripe_subscription_id}</p>
          </CardContent>
        </Card>
      )} */}
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
                  <div className="flex justify-between">
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
                  {/* <div className="flex justify-between">
                    <span className="text-gray-600">Trim:</span>
                    <span className="font-medium">{vehicleSpecs.trim}</span>
                  </div> */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Color:</span>
                    <span className="font-medium">{vehicleSpecs.color}</span>
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
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {appointmentDate && formatDate(appointmentDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    {appointmentTime && (
                      <span className="font-medium">
                        {formatTime(appointmentTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
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
                    <span className="text-gray-600">Add Ons:</span>
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
                    <span className="text-gray-600">Whole Duration:</span>
                    <span className="font-medium">
                      {calculateDuration()} minutes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Price:</span>
                    <span className="font-medium">${calculateTotal()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {isSubscribed && (
              <div className="flex items-center gap-1">
                <Crown className="w-4 h-4 text-yellow-500" />
                <p className=" text-sm text-green-600">
                  You’re subscribed — base wash is free! You only pay for
                  add-ons.
                </p>
              </div>
            )}
            {/* Action Buttons */}
            <div className="w-full md:flex space-y-3 md:space-y-0  md:justify-between">
              {/* <Button variant="outline" className=" px-8 py-3">
                Back to Date & Time
              </Button> */}
              <Button
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="bg-blue-900 hover:bg-blue-800 px-8 py-3"
              >
                {isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {isSubmitting ? "Redirecting..." : "Proceed to Payment"}
              </Button>
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

function ConfirmationLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-6 w-48 rounded"></div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="animate-pulse bg-white rounded-lg p-6 h-48"></div>
          <div className="animate-pulse bg-white rounded-lg p-6 h-64"></div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<ConfirmationLoading />}>
      <ConfirmationContent />
    </Suspense>
  );
}
