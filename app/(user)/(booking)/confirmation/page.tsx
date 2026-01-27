"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
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
} from "@/components/ui/alert-dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import LoadingDots from "@/components/loading";

const validateGuestInfo = (info: {
  name: string;
  email: string;
  phone: string;
}) => {
  const errors: Record<string, string> = {};

  if (!info.name || info.name.trim().length === 0) {
    errors.name = "Name is required";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!info.email || !emailRegex.test(info.email)) {
    errors.email = "Invalid email address";
  }

  return errors;
};

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const [guestInfo, setGuestInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [vehicleSpecs, setVehicleSpecs] = useState<any>({
    license_plate: searchParams.get("license_plate") ?? "",
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
    dateParam,
  );
  const [appointmentTime, setAppointmentTime] = useState<string | null>(
    timeParam,
  );

  const HOLIDAY_SALE_ACTIVE = true;
  const HOLIDAY_SALE_DISCOUNT = 0.1;

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
          0,
        )
      : 0;
    return base + addOnsTotal;
  };

  const calculateTotal = () => {
    let addOnsTotal = Array.isArray(selectedAddOns)
      ? selectedAddOns.reduce((sum: number, a: any) => {
          let price = Number(a.price);
          if (HOLIDAY_SALE_ACTIVE) {
            price = price * (1 - HOLIDAY_SALE_DISCOUNT);
          }
          return sum + price;
        }, 0)
      : 0;

    if (isSubscribed) return addOnsTotal;

    let basePrice = Number(selectedPackages?.price) || 0;
    if (HOLIDAY_SALE_ACTIVE) {
      basePrice = basePrice * (1 - HOLIDAY_SALE_DISCOUNT);
    }
    return basePrice + addOnsTotal;
  };

  const calculateOriginalTotal = () => {
    const addOnsTotal = Array.isArray(selectedAddOns)
      ? selectedAddOns.reduce((sum: number, a: any) => sum + Number(a.price), 0)
      : 0;
    if (isSubscribed) return addOnsTotal;
    const basePrice = Number(selectedPackages?.price) || 0;
    return basePrice + addOnsTotal;
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      setShowGuestModal(true);
      return;
    }
    await proceedToCheckout();
  };

  const proceedToCheckout = async (guestBooking?: boolean) => {
    try {
      setIsSubmitting(true);

      const customerName = guestBooking
        ? guestInfo.name
        : (user?.user_metadata?.full_name ?? "Guest");
      const customerEmail = guestBooking
        ? guestInfo.email
        : (user?.email ?? "");
      const customerPhone = guestBooking ? guestInfo.phone : undefined;

      const payload = {
        vehicleSpecs: vehicleSpecs.license_plate ?? null,
        servicePackageId: selectedPackages!.id,
        servicePackageName: selectedPackages!.name,
        servicePackagePrice: selectedPackages!.price,
        addOns:
          selectedAddOns?.map(
            (a: { id: string; name: string; price: number }) => ({
              id: a.id,
              name: a.name,
              price: a.price,
            }),
          ) ?? [],
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime!.toString(),
        totalPrice: calculateTotal(),
        originalTotalPrice: calculateOriginalTotal(),
        totalDuration: calculateDuration(),
        payment_method: "card",
        customerName,
        customerEmail,
        customerPhone,
      };

      const res = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to proceed to checkout. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                  <span className="text-slate-900 font-medium">
                    License Plate:
                  </span>
                  <span className="font-medium font-mono text-lg uppercase">
                    {vehicleSpecs.license_plate || "N/A"}
                  </span>
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
                </div>
              </div>
            </CardContent>
          </Card>

          {HOLIDAY_SALE_ACTIVE && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="bg-linear-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full">
                🎄 HOLIDAY SALE
              </div>
              <p className="text-sm text-red-700 font-semibold">
                5% OFF Applied! Save $
                {(calculateOriginalTotal() - calculateTotal()).toFixed(2)}
              </p>
            </div>
          )}

          <Button
            onClick={handleConfirmBooking}
            disabled={isSubmitting}
            className="bg-blue-900 hover:bg-blue-800 px-8 py-3 w-full text-lg font-semibold"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2" />
                Processing...
              </>
            ) : (
              "Proceed to Payment"
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            You will be redirected to secure payment powered by Stripe
          </p>
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

      <AlertDialog open={showGuestModal} onOpenChange={setShowGuestModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter Your Info</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide your information to proceed as a guest.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 mt-4">
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

            <div className="space-y-2">
              <Label htmlFor="guest-phone">Phone (optional)</Label>
              <Input
                id="guest-phone"
                type="tel"
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

                  const errors = validateGuestInfo(guestInfo);
                  if (Object.keys(errors).length > 0) {
                    setGuestErrors(errors);
                    return;
                  }

                  setGuestErrors({});
                  setShowGuestModal(false);
                  proceedToCheckout(true);
                }}
              >
                Continue to Payment
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
