"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { checkPromoCode, createBooking } from "@/app/(dashboard)/dashboard/booking/action";
import { getVehicleDisplay, VehicleDisplay } from "@/app/actions/vehicle";
import {
  BookingSelection,
  bookingSelectionKey,
  buildBookingSearch,
  parseBookingSelection,
} from "@/lib/booking/bookingParams";
import type { BookingInitialData } from "@/lib/booking/loadBookingStep";
import { validateAppointment } from "@/lib/booking/appointment";
import {
  AppliedPromo,
  DisplayPricing,
  computeDisplayPricing,
  computeTotalDuration,
} from "@/lib/booking/pricingDisplay";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";
import type { ServicePackage } from "@/lib/data/services";
import type { AddOnRow, ServicePackageRow } from "@/types/db";

import type { BookingStep } from "@/lib/booking/bookingParams";
export type { BookingStep } from "@/lib/booking/bookingParams";

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
  /** Guest ticked "Email me product news and offers" (never pre-ticked). */
  marketingOptIn: boolean;
}

// Single source of truth for an in-progress booking. Step state lives in the
// URL; this hook resolves it against the DB, exposes display pricing, and owns
// the submit() branches. The server re-validates price and payment rules on
// every path regardless of what the client sends.
//
// `initial` is what the step page loaded on the server. While the URL still
// matches what it loaded (fromServer), it is used as is and nothing is
// fetched. If the URL moves on without a server render, or the server could
// not load something, the browser fetches it as before.
export function useBookingFlow(
  ctx: BookingAuthContext,
  step: BookingStep,
  initial?: BookingInitialData
) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selection = useMemo(
    () => parseBookingSelection(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const fromServer =
    !!initial &&
    initial.selectionKey !== null &&
    initial.selectionKey === bookingSelectionKey(selection);
  const serverCatalog = step === "service" ? initial?.catalog ?? null : null;

  const [loading, setLoading] = useState(
    !(fromServer && (step !== "service" || serverCatalog))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Catalogs (service step only)
  const [services, setServices] = useState<ServicePackageRow[]>(serverCatalog?.services ?? []);
  const [allAddOns, setAllAddOns] = useState<AddOnRow[]>(serverCatalog?.addOns ?? []);

  // Selected entities (resolved from URL params on every step)
  const [service, setService] = useState<ServicePackageRow | null>(
    fromServer ? initial!.service : null
  );
  const [addOns, setAddOns] = useState<AddOnRow[]>(fromServer ? initial!.addOns : []);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleDisplay | null>(
    fromServer ? initial!.vehicleInfo : null
  );

  // Promo (display-side; the server re-validates on submit)
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  // --- Catalog fetch (service step) ---
  useEffect(() => {
    if (step !== "service") return;
    if (serverCatalog) {
      setServices(serverCatalog.services);
      setAllAddOns(serverCatalog.addOns);
      setLoading(false);
      return;
    }
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
  }, [step, supabase, serverCatalog]);

  // --- Selected service + add-ons (all steps; resolves URL params) ---
  const addOnIdsKey = selection.addOnIds.join(",");
  useEffect(() => {
    if (fromServer) {
      setService(initial!.service);
      setAddOns(initial!.addOns);
      if (step !== "service") setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // Both at once: these used to run one after the other on every step.
      const [serviceResult, addOnsResult] = await Promise.all([
        selection.serviceId
          ? supabase.from("service_packages").select("*").eq("id", selection.serviceId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        selection.addOnIds.length > 0
          ? supabase.from("add_ons").select("*").in("id", selection.addOnIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (cancelled) return;
      setService((serviceResult.data as ServicePackageRow | null) ?? null);
      if (addOnsResult.error) console.error(addOnsResult.error);
      else setAddOns((addOnsResult.data as AddOnRow[] | null) ?? []);
      if (step !== "service") setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selection.serviceId, addOnIdsKey, step, supabase, fromServer, initial]);

  // --- Vehicle display info (confirmation step) ---
  useEffect(() => {
    if (step !== "confirmation") return;
    if (fromServer) {
      setVehicleInfo(initial!.vehicleInfo);
      return;
    }
    const { licensePlate, vehicleId } = selection;
    if (!licensePlate && !vehicleId) return;
    getVehicleDisplay({ licensePlate, vehicleId }).then(setVehicleInfo);
  }, [step, selection.licensePlate, selection.vehicleId, fromServer, initial]);

  // --- Is the selected vehicle on the active subscription? The membership
  // (already loaded, with its cars) answers it; no extra query. Same plate
  // comparison as the server (case, spaces and dashes ignored). ---
  const isVehicleSubscribed = useMemo(() => {
    const key = (p: string | null | undefined) => (p ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const plate = key(selection.licensePlate);
    const cars = (ctx.subscription?.vehicles ?? []) as Array<{ id?: string; license_plate?: string | null }>;
    return cars.some(
      (v) => (plate && key(v.license_plate) === plate) || (!!selection.vehicleId && v.id === selection.vehicleId)
    );
  }, [selection.licensePlate, selection.vehicleId, ctx.subscription]);

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

  // --- Promo preview. Checked on the server with the same rules the booking
  // uses, so the browser never reads the promo_codes table. ---
  const applyPromoCode = useCallback(
    async (guestEmail?: string) => {
      if (!promoCode.trim() || !service) return;
      const result = await checkPromoCode({
        code: promoCode,
        serviceId: service.id,
        addOnIds: addOns.map((a) => a.id),
        guestEmail,
      }).catch(() => null);
      if (!result || !result.ok) {
        setAppliedPromo(null);
        toast.error(result && !result.ok ? result.message : "Could not check that code. Please try again.");
        return;
      }
      setAppliedPromo({ type: result.type, value: result.value });
      toast.success(
        result.type === "flat"
          ? `Promo applied: $${result.value.toFixed(2)} off your total`
          : `Promo applied: ${result.value}% off your total`
      );
    },
    [promoCode, service, addOns]
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
      // A double tap, or the modal's button pressed after the main one, must
      // not create a second booking or a second Stripe checkout.
      if (submittingRef.current) return;
      if (!service) {
        toast.error("Missing service selection. Please start over.");
        return;
      }
      // The date picker already blocks these; this catches a stale or
      // hand-edited URL with a friendly message instead of a server error.
      const notBookable = validateAppointment(selection.date ?? "", selection.time ?? "");
      if (notBookable) {
        toast.error(notBookable);
        return;
      }
      submittingRef.current = true;
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
          // The server counts the promo use; nothing to record here.
          window.location.href = `${ctx.successPath}?booking_id=${booking.id}`;
          return;
        }

        // Card → Stripe checkout. The webhook counts the promo once paid.
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
            marketingOptIn: opts.guest?.marketingOptIn === true,
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
        submittingRef.current = false;
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
    // Everything that decides the price is loaded: the chosen service and
    // add-ons, sign-in and membership. Until then a member could be shown a
    // payment screen for a wash that is free.
    ready: ctx.ready && !loading && !!service,
  };
}
