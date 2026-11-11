"use client";

import { useBooking } from "@/context/bookingContext";
import { ArrowRight, Car, PenLine, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { LicensePlate } from "./dashboard-home/license-plate";
import { useAuth } from "@/context/auth-context";
import { useEffect, useRef, useState } from "react";
import AuthPromptModal from "./user/authPromptModal";
import { useVehicleForm } from "@/hooks/useVehicleForm";
import { normalizePlate, plateError } from "@/lib/booking/plate";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import LoadingDots from "./loading";

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

/**
 * Mounted in the root layout on every page, so it renders (and fetches)
 * nothing until it is opened: the vehicle and membership queries run when a
 * customer actually starts a booking, not on every page load.
 */
export default function BookingModal() {
  const { isBookingModalOpen } = useBooking();
  return isBookingModalOpen ? <BookingModalContent /> : null;
}

function BookingModalContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { closeBookingModal } = useBooking();
  const [authOpen, setAuthOpen] = useState(false);

  const [subscriptionVehicles, setSubscriptionVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [enterManually, setEnterManually] = useState(false);

  const { vehicles: savedVehicles, loading: savedLoading } = useUserVehicles();
  const { vehicleInfo, setVehicleInfo, validate } = useVehicleForm();
  const [formError, setFormError] = useState<string | null>(null);
  const plateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchSubscriptionVehicle() {
      if (!user) {
        // console.log("No user, clearing subscription vehicles");
        setSubscriptionVehicles([]);
        setSelectedVehicleId(null);
        return;
      }

      const supabase = createClient();

      const { data: subscription } = await supabase
        .from("user_subscription")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!subscription) return;

      const { data: vechiles } = await supabase
        .from("subscription_vehicles")
        .select(
          `
          id,
          vehicle:vehicles (
          id,
          year,
          make,
          model,
          body_type,
          colors,
          license_plate
          )
          `
        )
        .eq("subscription_id", subscription.id);

      // console.log("subs", subscription, "vechiles", vechiles);

      if (vechiles) setSubscriptionVehicles(vechiles.map((v) => v.vehicle));
    }
    fetchSubscriptionVehicle();
  }, [user]);

  // All vehicle sources unified: subscription > saved > manual
  const hasSavedOrSubscription = subscriptionVehicles.length > 0 || savedVehicles.length > 0;
  const showDropdown = hasSavedOrSubscription && !enterManually;

  // Pre-fill plate when user picks a saved vehicle
  const handleVehicleSelect = (id: string) => {
    setSelectedVehicleId(id);
    setFormError(null);
    const fromSub = subscriptionVehicles.find((v) => v.id === id);
    const fromSaved = savedVehicles.find((v) => v.id === id);
    const plate = fromSub?.license_plate ?? fromSaved?.license_plate ?? "";
    setVehicleInfo((prev) => ({ ...prev, license_plate: plate }));
  };

  const handleBooking = () => {
    let params: URLSearchParams;

    setFormError(null);
    if (showDropdown) {
      if (!selectedVehicleId) {
        setFormError("Choose one of your vehicles, or use a different plate.");
        return;
      }
      const fromSub = subscriptionVehicles.find((v) => v.id === selectedVehicleId);
      const fromSaved = savedVehicles.find((v) => v.id === selectedVehicleId);
      const selected = fromSub ?? fromSaved;
      if (!selected) return;
      params = new URLSearchParams();
      if (selected.license_plate) params.set("license_plate", selected.license_plate);
      params.set("vehicle_id", selected.id);
    } else {
      const problem = plateError(vehicleInfo.license_plate);
      if (problem) {
        setFormError(problem);
        plateInputRef.current?.focus();
        return;
      }
      if (!validate()) return;
      const entries = Object.entries({
        ...vehicleInfo,
        license_plate: normalizePlate(vehicleInfo.license_plate),
      }).filter(
        (e): e is [string, string] => e[1] !== undefined && e[1] !== "",
      );
      params = new URLSearchParams(entries);
    }

    closeBookingModal();
    router.push(
      user
        ? `/dashboard/booking/service?${params.toString()}`
        : `/service?${params.toString()}`
    );
  };

  // Modal is open: wait for the auth check before rendering the vehicle form.
  if (isLoading) {
    return <LoadingDots />;
  }

  const vehicleOption = (v: { id: string; license_plate?: string | null; year?: number | string | null; make?: string | null; model?: string | null }) => {
    const details = [v.year, v.make, v.model].filter(Boolean).join(" ");
    return (
      <SelectItem key={v.id} value={v.id}>
        <span className="flex items-center gap-2">
          {v.license_plate && <LicensePlate plate={v.license_plate} />}
          {details && <span className="text-sm text-ink-muted">{details}</span>}
        </span>
      </SelectItem>
    );
  };
  const otherSaved = savedVehicles.filter((sv) => !subscriptionVehicles.some((sub) => sub.id === sv.id));

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && closeBookingModal()}>
        <DialogContent showCloseButton={false}
          className="gap-0 overflow-hidden rounded-2xl border-0 bg-paper p-0 text-ink sm:max-w-lg">
          <div className="relative bg-night py-6 pr-16 pl-6 text-on-night">
            <DialogClose
              aria-label="Close"
              className="absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-lg text-on-night hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
            >
              <X aria-hidden className="size-5" />
            </DialogClose>
            <DialogTitle className="text-2xl font-black tracking-tight text-on-night">
              {showDropdown ? "Which car is it?" : "Enter your license plate"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-on-night-muted">
              We use it to show your price and have the bay ready for you.
            </DialogDescription>
          </div>

          <div className="space-y-4 px-6 pt-5 pb-6">
            {showDropdown ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="booking-vehicle" className="font-semibold text-ink">
                    Your vehicles
                  </Label>
                  <Select value={selectedVehicleId ?? ""} onValueChange={handleVehicleSelect}>
                    <SelectTrigger
                      id="booking-vehicle"
                      aria-invalid={!!formError}
                      aria-describedby={formError ? "booking-vehicle-error" : undefined}
                      className="h-12 w-full bg-paper"
                    >
                      <SelectValue placeholder="Choose a vehicle" />
                    </SelectTrigger>
                    <SelectContent className="bg-paper text-ink">
                      {subscriptionVehicles.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-ink-muted">On your membership</SelectLabel>
                          {subscriptionVehicles.map(vehicleOption)}
                        </SelectGroup>
                      )}
                      {otherSaved.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-ink-muted">Saved vehicles</SelectLabel>
                          {otherSaved.map(vehicleOption)}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                  {formError && (
                    <p id="booking-vehicle-error" role="alert" className="text-sm font-medium text-destructive">
                      {formError}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEnterManually(true);
                    setSelectedVehicleId(null);
                    setFormError(null);
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <PenLine aria-hidden className="size-4" /> Use a different plate
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="booking-plate" className="font-semibold text-ink">
                    License plate
                  </Label>
                  <Input
                    ref={plateInputRef}
                    id="booking-plate"
                    value={vehicleInfo.license_plate}
                    onChange={(e) => {
                      setFormError(null);
                      setVehicleInfo((prev) => ({
                        ...prev,
                        license_plate: e.target.value.toUpperCase(),
                      }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBooking();
                    }}
                    maxLength={10}
                    autoComplete="off"
                    placeholder="ABC 1234"
                    aria-invalid={!!formError}
                    aria-describedby={formError ? "booking-plate-error" : undefined}
                    className="h-14 bg-paper text-center font-mono text-2xl font-semibold uppercase tracking-[0.14em]"
                    autoFocus
                  />
                  {formError && (
                    <p id="booking-plate-error" role="alert" className="text-sm font-medium text-destructive">
                      {formError}
                    </p>
                  )}
                </div>
                {hasSavedOrSubscription && (
                  <button
                    type="button"
                    onClick={() => {
                      setEnterManually(false);
                      setFormError(null);
                      setVehicleInfo((p) => ({ ...p, license_plate: "" }));
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-brand-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <Car aria-hidden className="size-4" /> Choose one of your vehicles
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handleBooking}
              disabled={savedLoading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {showDropdown ? "Choose a service" : "See my pricing"}
              <ArrowRight aria-hidden className="size-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AuthPromptModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
