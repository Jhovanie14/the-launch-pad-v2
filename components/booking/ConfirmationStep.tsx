"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Info, Loader2, Star } from "lucide-react";
import SubscriptionUpsellDialog from "@/components/subscription-upsell-dialog";
import { useBookingFlow, GuestInfo } from "@/hooks/useBookingFlow";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";
import type { BookingInitialData } from "@/lib/booking/loadBookingStep";
import { HOLIDAY_SALE_ACTIVE, HOLIDAY_SALE_DISCOUNT } from "@/lib/booking/holidaySale";
import { applySale, planCoversCategory } from "@/lib/booking/pricingDisplay";
import { cn } from "@/lib/utils";
import BookingTicket from "./BookingTicket";
import PaymentChoice from "./PaymentChoice";
import BookingSheet from "./ui/BookingSheet";
import StepLayout from "./ui/StepLayout";
import StepProgress from "./ui/StepProgress";
import { FLAME_BUTTON, FOCUS_ON_LIGHT, GHOST_BUTTON, RING_BUTTON, SURFACE } from "./ui/focus";

const money = (n: number) => `$${n.toFixed(2)}`;
const FIELD =
  "h-11 w-full rounded-lg bg-paper px-3 text-base text-ink ring-1 ring-line placeholder:text-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";

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

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className={cn(SURFACE, "flex items-start gap-3 p-4 text-base")}>
      <Star className="mt-0.5 size-5 shrink-0 text-svc-member-mark" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export default function ConfirmationStep({
  ctx,
  initial,
}: {
  ctx: BookingAuthContext;
  initial?: BookingInitialData;
}) {
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
    ready,
  } = useBookingFlow(ctx, "confirmation", initial);

  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    name: "",
    email: "",
    phone: "",
    marketingOptIn: false,
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

  const saleSavings = Math.max(0, pricing.originalTotal - pricing.saleTotal);
  const promoSavings = Math.max(0, pricing.saleTotal - pricing.finalTotal);
  const salePercent = Math.round(HOLIDAY_SALE_DISCOUNT * 100);

  const buttonLabel = isSubmitting
    ? "Redirecting..."
    : !ready
      ? "Loading your booking..."
      : isFreeForSubscriber
        ? "Confirm booking"
        : "Proceed to payment";

  return (
    <>
      <StepLayout
        above={ctx.variant === "dashboard" ? <StepProgress current={3} tone="canvas" className="mb-5" /> : undefined}
        back={{ label: "Change date or time", onClick: () => router.back() }}
        title="Check and confirm"
        action={{
          summaryTitle: !ready ? "Your booking" : isFreeForSubscriber ? "Free with your membership" : money(pricing.finalTotal),
          summaryDetail: !ready
            ? undefined
            : isFreeForSubscriber
              ? "No payment needed"
              : ctx.isAuthenticated
                ? "Pay by card or cash"
                : "Pay by card",
          button: (
            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={isSubmitting || !ready}
              className={FLAME_BUTTON}
            >
              {(isSubmitting || !ready) && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
              {buttonLabel}
            </button>
          ),
        }}
      >
        <BookingTicket
          date={selection.date}
          time={selection.time}
          service={service}
          addOns={addOns}
          duration={duration}
          plate={selection.licensePlate}
          vehicleInfo={vehicleInfo}
        />

        {/* Subscription status: today's three cases, unchanged in meaning. */}
        {pricing.isServiceFree ? (
          <Notice>
            Your {subscribedLabel} membership covers this service.
            {addOns.length > 0 ? " You only pay for the extras." : ""}
          </Notice>
        ) : ctx.subscription && isVehicleSubscribed ? (
          <Notice>
            Your {subscribedLabel} membership doesn&apos;t cover {serviceCategoryLabel} services, so this one is paid.
          </Notice>
        ) : ctx.subscription && !isVehicleSubscribed ? (
          <Notice>This car isn&apos;t on your membership, so standard prices apply.</Notice>
        ) : null}

        <section aria-labelledby="price-title" className={cn(SURFACE, "p-4 sm:p-5")}>
          <h2 id="price-title" className="sr-only">
            Price
          </h2>
          <dl className="space-y-2 text-base">
            {service && (
              <div className="flex justify-between gap-3">
                <dt>{service.name}</dt>
                <dd className="text-right">
                  {pricing.isServiceFree ? (
                    <>
                      <span className="mr-2 text-sm text-ink-muted line-through">{money(Number(service.price))}</span>
                      <span className="font-semibold text-svc-member-mark">Free</span>
                    </>
                  ) : (
                    money(Number(service.price))
                  )}
                </dd>
              </div>
            )}
            {addOns.map((a) => (
              <div key={a.id} className="flex justify-between gap-3">
                <dt>{a.name}</dt>
                <dd>{money(Number(a.price))}</dd>
              </div>
            ))}
            {HOLIDAY_SALE_ACTIVE && saleSavings > 0.004 && (
              <div className="flex justify-between gap-3 text-ink-muted">
                <dt>Holiday sale ({salePercent}% off)</dt>
                <dd>−{money(saleSavings)}</dd>
              </div>
            )}
            {appliedPromo && promoSavings > 0.004 && (
              <div className="flex justify-between gap-3 text-ink-muted">
                <dt>
                  {promoCode.trim().toUpperCase()} (
                  {appliedPromo.type === "flat" ? `${money(appliedPromo.value)} off` : `${appliedPromo.value}% off`})
                </dt>
                <dd>−{money(promoSavings)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-line-soft pt-3 text-lg font-black tracking-[-0.02em]">
              <dt>Total</dt>
              <dd>{money(pricing.finalTotal)}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <label htmlFor="promoCode" className="text-sm font-semibold">
              Promo code
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="promoCode"
                type="text"
                placeholder="Enter promo code"
                autoComplete="off"
                value={promoCode}
                disabled={isFreeForSubscriber}
                onChange={(e) => setPromoCode(e.target.value)}
                className={cn(FIELD, "flex-1 disabled:bg-canvas disabled:text-ink-subtle")}
              />
              <button
                type="button"
                className={RING_BUTTON}
                disabled={!promoCode || isFreeForSubscriber}
                onClick={() => applyPromoCode()}
              >
                {appliedPromo ? "Applied" : "Apply"}
              </button>
            </div>
            {isFreeForSubscriber && (
              <p className="mt-2 flex items-start gap-2 text-sm text-ink-muted">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                Promo codes don&apos;t apply: your wash is free with your membership.
              </p>
            )}
          </div>
        </section>
      </StepLayout>

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
          serviceCategory={service?.category ?? null}
          servicePrice={service ? applySale(Number(service.price)) : 0}
          onDismiss={handleUpsellDismiss}
          onSubscribe={handleUpsellSubscribe}
        />
      )}

      <BookingSheet
        open={showGuestModal}
        onOpenChange={setShowGuestModal}
        title="Your details"
        description="We send your booking confirmation to this email."
        footer={
          <>
            <button type="button" onClick={submitGuest} className={cn(FLAME_BUTTON, "w-full")}>
              Continue to payment
            </button>
            <button type="button" onClick={() => setShowGuestModal(false)} className={cn(GHOST_BUTTON, "w-full")}>
              Cancel
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="guest-name" className="text-sm font-semibold">
              Name
            </label>
            <input
              id="guest-name"
              type="text"
              autoComplete="name"
              value={guestInfo.name}
              aria-invalid={!!guestErrors.name}
              aria-describedby={guestErrors.name ? "guest-name-error" : undefined}
              onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
              className={cn(FIELD, "mt-2")}
            />
            {guestErrors.name && (
              <p id="guest-name-error" className="mt-1 text-sm text-destructive">
                {guestErrors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="guest-email" className="text-sm font-semibold">
              Email
            </label>
            <input
              id="guest-email"
              type="email"
              autoComplete="email"
              value={guestInfo.email}
              aria-invalid={!!guestErrors.email}
              aria-describedby={guestErrors.email ? "guest-email-error" : undefined}
              onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
              className={cn(FIELD, "mt-2")}
            />
            {guestErrors.email && (
              <p id="guest-email-error" className="mt-1 text-sm text-destructive">
                {guestErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="guest-phone" className="text-sm font-semibold">
              Phone <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="guest-phone"
              type="tel"
              autoComplete="tel"
              value={guestInfo.phone}
              onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
              className={cn(FIELD, "mt-2")}
            />
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="guest-marketing"
              checked={guestInfo.marketingOptIn}
              onCheckedChange={(checked) => setGuestInfo({ ...guestInfo, marketingOptIn: checked === true })}
              className={cn("mt-0.5 size-5", FOCUS_ON_LIGHT)}
            />
            <label htmlFor="guest-marketing" className="text-sm leading-snug text-ink-muted">
              Email me product news and offers. You can unsubscribe at any time.
            </label>
          </div>
        </div>
      </BookingSheet>
    </>
  );
}
