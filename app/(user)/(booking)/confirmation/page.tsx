"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import { createBooking } from "../../../(dashboard)/dashboard/booking/action";
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
import z from "zod";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import LoadingDots from "@/components/loading";

const guestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
});

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");

  const [guestInfo, setGuestInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [vehicleSpecs, setVehicleSpecs] = useState<any>({
    year: searchParams.get("year"),
    make: searchParams.get("make"),
    model: searchParams.get("model"),
    body_type: searchParams.get("body_type"),
    color: searchParams.get("color"),
  });

  const [selectedPackages, setSelectedPackages] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<any>(null);
  const [userSubscribe, setUserSubscribe] = useState<any>(null);

  const serviceId = searchParams.get("service");
  const addonsParam = searchParams.get("addons");
  const dateParam = searchParams.get("date");
  const timeParam = searchParams.get("time");

  const [guestErrors, setGuestErrors] = useState<Record<string, string>>({});

  const [appointmentDate, setAppointmentDate] = useState<string | null>(
    dateParam
  );
  const [appointmentTime, setAppointmentTime] = useState<string | null>(
    timeParam
  );

  // ============================================
  // HOLIDAY SALE: START - Remove all code between START and END when sale ends
  // ============================================
  const HOLIDAY_SALE_ACTIVE = true; // Set to false when sale ends
  const HOLIDAY_SALE_DISCOUNT = 0.35; // 35% off
  // ============================================
  // HOLIDAY SALE: END
  // ============================================

  const isSubscribed = user ? !!userSubscribe?.stripe_subscription_id : false;

  useEffect(() => {
    (async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from("user_subscription")
          .select("stripe_customer_id,stripe_subscription_id")
          .eq("user_id", user?.id)
          .eq("status", "active")
          .maybeSingle();

        if (error) console.error(error);
        else setUserSubscribe(data);
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
            .in("id", addonIds);
          if (error) console.error(error);
          else setSelectedAddOns(data);
        }
      }
    })();
  }, [serviceId, addonsParam, supabase, user?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const calculateDuration = () => {
    const base = Number(selectedPackages?.duration) || 0;
    const addOnsTotal = Array.isArray(selectedAddOns)
      ? selectedAddOns.reduce(
          (sum: number, a: any) => sum + Number(a.duration),
          0
        )
      : 0;
    return base + addOnsTotal;
  };

  const calculateTotal = () => {
    // ============================================
    // HOLIDAY SALE: START
    // ============================================
    let addOnsTotal = Array.isArray(selectedAddOns)
      ? selectedAddOns.reduce(
          (sum: number, a: any) => {
            let price = Number(a.price);
            // Apply holiday sale to add-ons
            if (HOLIDAY_SALE_ACTIVE) {
              price = price * (1 - HOLIDAY_SALE_DISCOUNT);
            }
            return sum + price;
          },
          0
        )
      : 0;
    
    if (isSubscribed) return addOnsTotal;
    
    let basePrice = Number(selectedPackages?.price) || 0;
    // Apply holiday sale to base price
    if (HOLIDAY_SALE_ACTIVE) {
      basePrice = basePrice * (1 - HOLIDAY_SALE_DISCOUNT);
    }
    return basePrice + addOnsTotal;
    // ============================================
    // HOLIDAY SALE: END - Replace above with original code:
    // const addOnsTotal = Array.isArray(selectedAddOns)
    //   ? selectedAddOns.reduce((sum: number, a: any) => sum + Number(a.price), 0)
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
      ? selectedAddOns.reduce((sum: number, a: any) => sum + Number(a.price), 0)
      : 0;
    if (isSubscribed) return addOnsTotal;
    const basePrice = Number(selectedPackages?.price) || 0;
    return basePrice + addOnsTotal;
  };
  // ============================================
  // HOLIDAY SALE: END
  // ============================================

  const handleConfirmBooking = async () => {
    if (!user) {
      setShowGuestModal(true);
      return;
    }

    // Subscribed users without add-ons
    if (isSubscribed && (!selectedAddOns || selectedAddOns.length === 0)) {
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
          appointmentTime: appointmentTime!,
          totalPrice: 0,
          totalDuration: calculateDuration(),
          payment_method: "subscription",
        });
        window.location.href = `/dashboard/bookings/success?booking_id=${booking.id}`;
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setShowPaymentModal(true);
  };

  const confirmPaymentChoice = async (guestBooking?: boolean) => {
    try {
      setIsSubmitting(true);
      setShowPaymentModal(false);

      // const addOnsTotal = Array.isArray(selectedAddOns)
      //   ? selectedAddOns.reduce((sum, a) => sum + Number(a.price), 0)
      //   : 0;

      const customerName = guestBooking
        ? guestInfo.name
        : (user?.user_metadata?.full_name ?? "Guest");
      const customerEmail = guestBooking
        ? guestInfo.email
        : (user?.email ?? "");
      const customerPhone = guestBooking ? guestInfo.phone : undefined;

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
          // addOnsId:
          //   selectedAddOns?.map(
          //     (a: { id: string; name: string; price: number }) => ({
          //       id: a.id,
          //       name: a.name,
          //       price: a.price,
          //     })
          //   ) ?? [],
          appointmentDate: new Date(appointmentDate!),
          appointmentTime: appointmentTime!.toString(),
          totalPrice: calculateTotal(),
          totalDuration: calculateDuration(),
          payment_method: "cash",
          customerName,
          customerEmail,
          customerPhone,
        });

        const successUrl = user
          ? `/dashboard/bookings/success?booking_id=${booking.id}`
          : `/success?booking_id=${booking.id}`;
        window.location.href = successUrl;
        return;
      }

      // Card payment (Stripe)
      const payload = {
        year: parseInt(vehicleSpecs.year || "0"),
        make: vehicleSpecs.make || "",
        model: vehicleSpecs.model || "",
        body_type: vehicleSpecs.body_type || "",
        colors: [vehicleSpecs.color || ""],
        vehicleSpecs,
        servicePackageId: selectedPackages!.id,
        servicePackageName: selectedPackages!.name,
        servicePackagePrice: selectedPackages!.price, // 👈 zero if subscribed
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
        totalPrice: calculateTotal(),
        totalDuration: calculateDuration(),
        payment_method: "card",
        customerName,
        customerEmail,
        customerPhone,
      };

      // console.log(payload);

      // Card payment
      const res = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Vehicle & Appointment */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Car className="w-5 h-5 mr-2" />
                Vehicle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Body Type:</span>
                  <span className="font-medium">{vehicleSpecs.body_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Color:</span>
                  <span className="font-medium">{vehicleSpecs.color}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
                  <span className="font-medium">{selectedPackages?.name}</span>
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
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                  {/* ============================================
                      HOLIDAY SALE: END - Replace above with:
                      <span className="font-medium">${calculateTotal()}</span>
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
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full">
                🎄 HOLIDAY SALE
              </div>
              <p className="text-sm text-red-700 font-semibold">
                35% OFF Applied! Save ${(calculateOriginalTotal() - calculateTotal()).toFixed(2)}
              </p>
            </div>
          )}
          {/* ============================================
              HOLIDAY SALE: END
              ============================================ */}
          <Button
            onClick={handleConfirmBooking}
            disabled={isSubmitting}
            className="bg-blue-900 hover:bg-blue-800 px-8 py-3 w-full"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2" />
            ) : null}
            {isSubmitting ? "Processing..." : "Proceed to Payment"}
          </Button>
        </div>

        {/* Right: Progress */}
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

      {/* Payment Modal */}
      <AlertDialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Choose Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Please select how you’d like to pay for your booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Card */}
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
                className={`w-6 h-6 ${paymentMethod === "card" ? "text-blue-600" : "text-gray-500"}`}
              />
              <span
                className={`text-sm font-medium ${paymentMethod === "card" ? "text-blue-700" : "text-gray-700"}`}
              >
                Card
              </span>
            </label>

            {/* Cash */}
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
                className={`w-6 h-6 ${paymentMethod === "cash" ? "text-green-600" : "text-gray-500"}`}
              />
              <span
                className={`text-sm font-medium ${paymentMethod === "cash" ? "text-green-700" : "text-gray-700"}`}
              >
                Cash
              </span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-900 hover:bg-blue-800"
              onClick={() => confirmPaymentChoice(!user)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Guest Info Modal */}
      <AlertDialog open={showGuestModal} onOpenChange={setShowGuestModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter Your Info</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide your information to proceed as a guest.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 mt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="guest-name">Name</Label>
              <Input
                id="guest-name"
                type="text"
                placeholder="Enter your name"
                value={guestInfo.name}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, name: e.target.value })
                }
              />
              {guestErrors.name && (
                <p className="text-red-500 text-sm mt-1">{guestErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email</Label>
              <Input
                id="guest-email"
                type="email"
                placeholder="Enter your email"
                value={guestInfo.email}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, email: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                We need your email to send booking confirmation.
              </p>
              {guestErrors.email && (
                <p className="text-red-500 text-sm mt-1">{guestErrors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="guest-phone">Phone (optional)</Label>
              <Input
                id="guest-phone"
                type="number"
                placeholder="Enter your phone number"
                value={guestInfo.phone}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, phone: e.target.value })
                }
              />
              {guestErrors.phone && (
                <p className="text-red-500 text-sm mt-1">{guestErrors.phone}</p>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="px-4 py-2 rounded">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                className="bg-blue-900 hover:bg-blue-800 px-4 py-2 rounded text-white"
                onClick={(e) => {
                  e.preventDefault();

                  const validation = guestSchema.safeParse(guestInfo);
                  if (!validation.success) {
                    const fieldErrors: Record<string, string> = {};
                    validation.error.issues.forEach((issue) => {
                      if (issue.path[0])
                        fieldErrors[issue.path[0] as string] = issue.message;
                    });
                    setGuestErrors(fieldErrors); // Show errors under inputs
                    return; // Stop modal from closing
                  }

                  // Clear errors and proceed
                  setGuestErrors({});
                  setShowGuestModal(false);
                  setShowPaymentModal(true);
                }}
              >
                Continue
              </Button>
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
