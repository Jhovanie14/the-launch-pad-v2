"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { createBooking } from "@/app/(dashboard)/dashboard/booking/action";
import { getVehicleDisplay, VehicleDisplay } from "@/app/actions/vehicle";
import {
  BookingSelection,
  buildBookingSearch,
  parseBookingSelection,
} from "@/lib/booking/bookingParams";
import {
  AppliedPromo,
  DisplayPricing,
  computeDisplayPricing,
  computeTotalDuration,
} from "@/lib/booking/pricingDisplay";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";
import type { ServicePackage } from "@/lib/data/services";
import type { AddOnRow, ServicePackageRow } from "@/types/db";

export type BookingStep = "service" | "datetime" | "confirmation";

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

// Single source of truth for an in-progress booking. Step state lives in the
// URL; this hook resolves it against the DB, exposes display pricing, and owns
// the submit() branches. The server re-validates price and payment rules on
// every path regardless of what the client sends.
export function useBookingFlow(ctx: BookingAuthContext, step: BookingStep) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selection = useMemo(
    () => parseBookingSelection(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Catalogs (service step only)
  const [services, setServices] = useState<ServicePackageRow[]>([]);
  const [allAddOns, setAllAddOns] = useState<AddOnRow[]>([]);

  // Selected entities (resolved from URL params on every step)
  const [service, setService] = useState<ServicePackageRow | null>(null);
  const [addOns, setAddOns] = useState<AddOnRow[]>([]);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleDisplay | null>(null);
  const [isVehicleSubscribed, setIsVehicleSubscribed] = useState(false);

  // Promo (display-side; the server re-validates on submit)
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [appliedPromoId, setAppliedPromoId] = useState<number | null>(null);

  // --- Catalog fetch (service step) ---
  useEffect(() => {
    if (step !== "service") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: pkgs, error: pkgErr }, { data: adds, error: addErr }] =
        await Promise.all([
          supabase
            .from("service_packages")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: true }),
          supabase
            .from("add_ons")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: true }),
        ]);
      if (cancelled) return;
      if (pkgErr) console.error(pkgErr);
      if (addErr) console.error(addErr);
      setServices(pkgs ?? []);
      setAllAddOns(adds ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, supabase]);

  // --- Selected service + add-ons (all steps; resolves URL params) ---
  const addOnIdsKey = selection.addOnIds.join(",");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (selection.serviceId) {
        const { data } = await supabase
          .from("service_packages")
          .select("*")
          .eq("id", selection.serviceId)
          .single();
        if (!cancelled) setService(data);
      } else {
        setService(null);
      }
      if (selection.addOnIds.length > 0) {
        const { data, error } = await supabase
          .from("add_ons")
          .select("*")
          .in("id", selection.addOnIds);
        if (error) console.error(error);
        else if (!cancelled) setAddOns(data ?? []);
      } else {
        setAddOns([]);
      }
      if (step !== "service" && !cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selection.serviceId, addOnIdsKey, step, supabase]);

  // --- Vehicle display info (confirmation step) ---
  useEffect(() => {
    if (step !== "confirmation") return;
    const { licensePlate, vehicleId } = selection;
    if (!licensePlate && !vehicleId) return;
    getVehicleDisplay({ licensePlate, vehicleId }).then(setVehicleInfo);
  }, [step, selection.licensePlate, selection.vehicleId]);

  // --- Is the selected vehicle on the active subscription? ---
  useEffect(() => {
    const plate = selection.licensePlate;
    const subId = ctx.subscription?.id;
    if (!plate || !subId) {
      setIsVehicleSubscribed(false);
      return;
    }
    supabase
      .from("subscription_vehicles")
      .select("id, vehicle:vehicles!inner(license_plate)")
      .eq("subscription_id", subId)
      .eq("vehicles.license_plate", plate)
      .maybeSingle()
      .then(({ data }) => setIsVehicleSubscribed(!!data));
  }, [selection.licensePlate, ctx.subscription?.id, supabase]);

  const planName = ctx.subscription?.subscription_plans?.name ?? null;

  const pricing: DisplayPricing = useMemo(
    () =>
      computeDisplayPricing({
        service: service
          ? { price: Number(service.price), category: service.category }
          : null,
        addOns: addOns.map((a) => ({ id: a.id, price: Number(a.price) })),
        planName,
        isVehicleSubscribed,
        promo: appliedPromo,
      }),
    [service, addOns, planName, isVehicleSubscribed, appliedPromo]
  );

  const duration = useMemo(
    () => computeTotalDuration(service, addOns),
    [service, addOns]
  );

  // --- Promo validation (display/UX only — server re-validates on submit).
  // Ported verbatim from the dashboard confirmation page. ---
  const applyPromoCode = useCallback(async () => {
    if (!promoCode) return;

    const { data, error } = await supabase
      .from("promo_codes")
      .select(
        "id, discount_type, discount_percent, discount_amount, is_active, applies_to, max_uses, used_count, restricted_to_service"
      )
      .ilike("code", promoCode.trim())
      .maybeSingle();

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

    if (data.restricted_to_service) {
      const serviceName = (service?.name ?? "").toLowerCase();
      const serviceCategory = (service?.category ?? "").toLowerCase();
      const restriction = data.restricted_to_service.toLowerCase();
      if (!serviceName.includes(restriction) && !serviceCategory.includes(restriction)) {
        toast.error(
          `This promo code is only valid for "${data.restricted_to_service}" bookings`
        );
        return;
      }
      if (ctx.subscription) {
        toast.error("This promo code is only available for non-subscribers");
        return;
      }
    }

    if (ctx.userId) {
      const { data: existing } = await supabase
        .from("promo_code_redemptions")
        .select("id")
        .eq("promo_code_id", data.id)
        .eq("user_id", ctx.userId)
        .maybeSingle();
      if (existing) {
        toast.error("You have already used this promo code");
        return;
      }
    }

    const dtype = (data.discount_type ?? "percent") as "percent" | "flat";
    setAppliedPromoId(data.id);
    if (dtype === "flat") {
      setAppliedPromo({ type: "flat", value: Number(data.discount_amount) });
      toast.success(
        `Promo applied! $${Number(data.discount_amount).toFixed(2)} off your total`
      );
    } else {
      setAppliedPromo({ type: "percent", value: Number(data.discount_percent) });
      toast.success(`Promo applied! ${data.discount_percent}% off your total`);
    }
  }, [promoCode, service, ctx.userId, ctx.subscription, supabase]);

  const recordPromoRedemption = useCallback(
    async (guestEmail?: string) => {
      if (!appliedPromoId) return;
      await supabase.from("promo_code_redemptions").insert({
        promo_code_id: appliedPromoId,
        user_id: ctx.userId,
        customer_email: guestEmail ?? ctx.userEmail,
      });
    },
    [appliedPromoId, ctx.userId, ctx.userEmail, supabase]
  );

  // --- Navigation between steps ---
  const goToDateTime = useCallback(
    (patch: Partial<BookingSelection> = {}) => {
      router.push(
        `${ctx.stepBasePath}/datetime?${buildBookingSearch({ ...selection, ...patch })}`
      );
    },
    [router, ctx.stepBasePath, selection]
  );

  const goToConfirmation = useCallback(
    (patch: Partial<BookingSelection> = {}) => {
      router.push(
        `${ctx.stepBasePath}/confirmation?${buildBookingSearch({ ...selection, ...patch })}`
      );
    },
    [router, ctx.stepBasePath, selection]
  );

  // --- Submit. Branches on payment method; the server re-validates price
  // and payment rules regardless of what we send. ---
  const submit = useCallback(
    async (opts: {
      paymentMethod: "card" | "cash" | "subscription";
      guest?: GuestInfo;
    }) => {
      if (!service) {
        toast.error("Missing service selection. Please start over.");
        return;
      }
      setIsSubmitting(true);
      try {
        if (opts.paymentMethod === "cash" || opts.paymentMethod === "subscription") {
          const isFree = opts.paymentMethod === "subscription";
          const booking = await createBooking({
            license_plate: selection.licensePlate,
            vehicle_id: selection.vehicleId || undefined,
            servicePackage: {
              ...service,
              price: pricing.isServiceFree ? 0 : service.price,
            } as ServicePackage,
            addOnsId: isFree ? [] : addOns.map((a) => a.id),
            appointmentDate: new Date(selection.date!),
            appointmentTime: selection.time!,
            totalPrice: isFree ? 0 : pricing.finalTotal,
            totalDuration: duration,
            payment_method: opts.paymentMethod,
            promoCode,
          });
          if (!isFree) await recordPromoRedemption();
          window.location.href = `${ctx.successPath}?booking_id=${booking.id}`;
          return;
        }

        // Card → Stripe checkout
        await recordPromoRedemption(opts.guest?.email);
        const res = await fetch("/api/checkout_sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleSpecs: {
              license_plate: selection.licensePlate,
              vehicle_id: selection.vehicleId,
            },
            servicePackageId: service.id,
            servicePackageName: service.name,
            servicePackagePrice: pricing.isServiceFree ? 0 : service.price,
            addOns: addOns.map((a) => ({ id: a.id, name: a.name, price: a.price })),
            appointmentDate: selection.date,
            appointmentTime: selection.time,
            totalPrice: pricing.finalTotal,
            totalDuration: duration,
            payment_method: "card",
            customerName: opts.guest?.name ?? ctx.userFullName ?? "Guest",
            customerEmail: opts.guest?.email ?? ctx.userEmail ?? "",
            customerPhone: opts.guest?.phone,
            promoCode,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.url) {
          throw new Error(data?.error ?? "Failed to create checkout session");
        }
        window.location.href = data.url;
      } catch (err) {
        console.error("Booking submit failed:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to complete booking. Please try again."
        );
        setIsSubmitting(false);
      }
    },
    [
      service,
      addOns,
      selection,
      pricing,
      duration,
      promoCode,
      ctx.successPath,
      ctx.userFullName,
      ctx.userEmail,
      recordPromoRedemption,
    ]
  );

  return {
    selection,
    loading,
    services,
    allAddOns,
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
    goToDateTime,
    goToConfirmation,
    isSubmitting,
    submit,
  };
}
