"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Loader2,
  PackageCheck,
} from "lucide-react";
import SubscriptionUpsellDialog from "@/components/subscription-upsell-dialog";
import { useBookingFlow, GuestInfo } from "@/hooks/useBookingFlow";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";
import BookingSummary from "./BookingSummary";
import PaymentChoice from "./PaymentChoice";
import { HOLIDAY_SALE_ACTIVE, HOLIDAY_SALE_DISCOUNT } from "@/lib/booking/holidaySale";
import { planCoversCategory } from "@/lib/booking/pricingDisplay";

const validateGuestInfo = (info: GuestInfo) => {
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

export default function ConfirmationStep({ ctx }: { ctx: BookingAuthContext }) {
  const router = useRouter();
  const {
    selection,
    service,
    addOns,
    vehicleInfo,
    isVehicleSubscribed,
    planName,
    pricing,
    duration,
    promoCode,
    setPromoCode,
    appliedPromo,
    applyPromoCode,
    isSubmitting,
    submit,
  } = useBookingFlow(ctx, "confirmation");

  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    name: "",
    email: "",
    phone: "",
  });
  const [guestErrors, setGuestErrors] = useState<Record<string, string>>({});

  const isFreeForSubscriber =
    ctx.isAuthenticated && pricing.isServiceFree && addOns.length === 0;

  // The upsell only ever existed on the guest tree (D5).
  const shouldOfferUpsell =
    ctx.variant === "guest" && !ctx.subscription && !upsellDismissed;

  const proceedAfterUpsell = () => {
    if (isFreeForSubscriber) {
      submit({ paymentMethod: "subscription" });
    } else if (!ctx.isAuthenticated) {
      setShowGuestModal(true);
    } else {
      setShowPaymentModal(true);
    }
  };

  const handleConfirmBooking = () => {
    if (shouldOfferUpsell) {
      setShowUpsell(true);
      return;
    }
    proceedAfterUpsell();
  };

  const handleUpsellDismiss = () => {
    setShowUpsell(false);
    setUpsellDismissed(true);
    proceedAfterUpsell();
  };

  const handleUpsellSubscribe = (planId: string) => {
    setShowUpsell(false);
    window.location.href = `/pricing/cart?plan=${encodeURIComponent(planId)}&billing=monthly`;
  };

  const confirmPaymentChoice = () => {
    setShowPaymentModal(false);
    submit({ paymentMethod });
  };

  const submitGuest = () => {
    const errors = validateGuestInfo(guestInfo);
    if (Object.keys(errors).length > 0) {
      setGuestErrors(errors);
      return;
    }
    setGuestErrors({});
    setShowGuestModal(false);
    submit({ paymentMethod: "card", guest: guestInfo });
  };

  // Label for the subscription status banners
  const subscribedLabel = planName
    ? planCoversCategory(planName, "quick service")
      ? "Quick Service"
      : planName.toLowerCase().includes("commercial")
        ? "Commercial Wash"
        : "Express Detail"
    : "";
  const serviceCategoryLabel =
    service?.category?.toLowerCase() === "quick service"
      ? "Quick Service"
      : "Express Detail";

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
          <div className="space-y-6">
            <BookingSummary
              licensePlate={selection.licensePlate}
              vehicleInfo={vehicleInfo}
              service={service}
              addOns={addOns}
              date={selection.date}
              time={selection.time}
              duration={duration}
              pricing={pricing}
              promoApplied={!!appliedPromo}
            />

            {/* ============================================
                HOLIDAY SALE: START - Remove this badge when sale ends
                ============================================ */}
            {HOLIDAY_SALE_ACTIVE && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="bg-linear-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full">
                  SALE
                </div>
                <p className="text-sm text-red-700 font-semibold">
                  {Math.round(HOLIDAY_SALE_DISCOUNT * 100)}% OFF Applied! Save $
                  {pricing.savings.toFixed(2)}
                </p>
              </div>
            )}
            {/* ============================================
                HOLIDAY SALE: END
                ============================================ */}

            {/* Subscription status banners */}
            {pricing.isServiceFree ? (
              <div className="flex items-center gap-1">
                <Crown className="w-4 h-4 text-yellow-500" />
                <p className="text-sm text-green-600">
                  You're subscribed to {subscribedLabel} — this service is
                  free! You only pay for add-ons.
                </p>
              </div>
            ) : ctx.subscription && isVehicleSubscribed ? (
              <div className="flex items-center gap-1">
                <Crown className="w-4 h-4 text-yellow-500" />
                <p className="text-sm text-orange-600">
                  You're subscribed to {subscribedLabel} — this{" "}
                  {serviceCategoryLabel} service requires payment.
                </p>
              </div>
            ) : ctx.subscription && !isVehicleSubscribed ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700">
                  This vehicle is not part of your subscription — standard
                  pricing applies.
                </p>
              </div>
            ) : null}

            {appliedPromo && (
              <p className="text-green-600 text-sm mt-2">
                Promo applied:{" "}
                {appliedPromo.type === "flat"
                  ? `$${appliedPromo.value.toFixed(2)} off`
                  : `${appliedPromo.value}% off`}{" "}
                — New Total: ${pricing.finalTotal.toFixed(2)}
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
                    onClick={applyPromoCode}
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

      <PaymentChoice
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        allowCash={ctx.isAuthenticated}
        value={paymentMethod}
        onChange={setPaymentMethod}
        onConfirm={confirmPaymentChoice}
      />

      {ctx.variant === "guest" && (
        <SubscriptionUpsellDialog
          open={showUpsell}
          bookingTotal={pricing.finalTotal}
          onDismiss={handleUpsellDismiss}
          onSubscribe={handleUpsellSubscribe}
        />
      )}

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
                  submitGuest();
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
