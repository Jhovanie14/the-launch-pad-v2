"use client";

import { useBooking } from "@/context/bookingContext";
import { Button } from "./ui/button";
import { Car, PenLine, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useEffect, useState } from "react";
import AuthPromptModal from "./user/authPromptModal";
import { useVehicleForm } from "@/hooks/useVehicleForm";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
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

export default function BookingModal() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { isBookingModalOpen, closeBookingModal } = useBooking();
  const [authOpen, setAuthOpen] = useState(false);

  const [subscriptionVehicles, setSubscriptionVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [enterManually, setEnterManually] = useState(false);

  const { vehicles: savedVehicles, loading: savedLoading } = useUserVehicles();
  const { vehicleInfo, setVehicleInfo, errors, validate } = useVehicleForm();

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
    const fromSub = subscriptionVehicles.find((v) => v.id === id);
    const fromSaved = savedVehicles.find((v) => v.id === id);
    const plate = fromSub?.license_plate ?? fromSaved?.license_plate ?? "";
    setVehicleInfo((prev) => ({ ...prev, license_plate: plate }));
  };

  const handleBooking = () => {
    let params: URLSearchParams;

    if (showDropdown && selectedVehicleId) {
      const fromSub = subscriptionVehicles.find((v) => v.id === selectedVehicleId);
      const fromSaved = savedVehicles.find((v) => v.id === selectedVehicleId);
      const selected = fromSub ?? fromSaved;
      if (!selected) return;
      params = new URLSearchParams({ license_plate: selected.license_plate });
    } else {
      if (!validate()) return;
      const entries = Object.entries(vehicleInfo).filter(
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

  if (isLoading) {
    return <LoadingDots />;
  }

  if (!isBookingModalOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-xl mx-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold">
              {showDropdown ? "Select Your Vehicle" : "Enter Your Vehicle Info"}
            </h2>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={closeBookingModal}
            >
              <X className="text-red-600" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Add your car information to help our team prepare for your service.
          </p>

          {showDropdown ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Vehicle</Label>
                <Select value={selectedVehicleId ?? ""} onValueChange={handleVehicleSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a saved vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionVehicles.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Subscription Vehicles
                        </div>
                        {subscriptionVehicles.map((v) => {
                          const details = [v.year, v.make, v.model].filter(Boolean).join(" ");
                          return (
                            <SelectItem key={v.id} value={v.id}>
                              <div className="flex items-center gap-2">
                                <Car className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-mono font-semibold">{v.license_plate}</span>
                                {details && <span className="text-muted-foreground text-xs">— {details}</span>}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </>
                    )}
                    {savedVehicles.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          My Saved Vehicles
                        </div>
                        {savedVehicles
                          .filter((sv) => !subscriptionVehicles.some((sub) => sub.id === sv.id))
                          .map((v) => {
                            const details = [v.year, v.make, v.model].filter(Boolean).join(" ");
                            return (
                              <SelectItem key={v.id} value={v.id}>
                                <div className="flex items-center gap-2">
                                  <Car className="w-3.5 h-3.5 shrink-0" />
                                  <span className="font-mono font-semibold">{v.license_plate}</span>
                                  {details && <span className="text-muted-foreground text-xs">— {details}</span>}
                                </div>
                              </SelectItem>
                            );
                          })}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                onClick={() => { setEnterManually(true); setSelectedVehicleId(null); }}
                className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline"
              >
                <PenLine className="w-3.5 h-3.5" /> Enter a different plate
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>License Plate</Label>
                <Input
                  value={vehicleInfo.license_plate}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      license_plate: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g., ABC 1234 or leave blank"
                  className="text-lg font-mono uppercase tracking-widest"
                  autoFocus
                />
                {errors.license_plate && (
                  <p className="text-red-500 text-sm">{errors.license_plate}</p>
                )}
              </div>
              {hasSavedOrSubscription && (
                <button
                  type="button"
                  onClick={() => { setEnterManually(false); setVehicleInfo((p) => ({ ...p, license_plate: "" })); }}
                  className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline"
                >
                  <Car className="w-3.5 h-3.5" /> Choose a saved vehicle
                </button>
              )}
            </div>
          )}

          <div className="mt-6">
            <Button
              className="w-full bg-blue-900 text-white hover:bg-blue-800"
              onClick={handleBooking}
              disabled={savedLoading}
            >
              {showDropdown ? "Proceed to Services" : "See My Pricing"}
            </Button>
          </div>
        </div>
      </div>

      <AuthPromptModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
