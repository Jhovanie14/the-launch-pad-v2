"use client";

import { useBooking } from "@/context/bookingContext";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useEffect, useState } from "react";
import AuthPromptModal from "./user/authPromptModal";
import { useVehicleForm } from "@/hooks/useVehicleForm";
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
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );

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

  const handleBooking = () => {
    console.log("handleBooking clicked");

    let params: URLSearchParams;

    // ✅ Only run validate() if no subscribed vehicle is selected
    if (subscriptionVehicles.length === 0) {
      if (!validate()) {
        // console.log("Validation failed for manual vehicle input");
        return;
      }
    }

    if (subscriptionVehicles.length > 0 && selectedVehicleId) {
      const selected = subscriptionVehicles.find(
        (v) => v.id === selectedVehicleId
      );
      if (!selected) {
        // console.log("No selected vehicle");
        return;
      }
      params = new URLSearchParams({
        license_plate: selected.license_plate,
      });
    } else {
      // Build URL with vehicle specs
      params = new URLSearchParams({
        ...vehicleInfo,
      });
    }
    // console.log("Redirecting with:", params.toString());
    closeBookingModal();

    // Redirect to service selection page
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
              {subscriptionVehicles.length > 0
                ? "Select Your Subscribed Vehicle"
                : "Enter Your Vehicle Info"}
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
          {/* Vehicle details help us serve you faster */}

          {subscriptionVehicles.length > 0 ? (
            <div className="space-y-3">
              <Label htmlFor="vehicle">Vehicle</Label>
              <Select
                value={selectedVehicleId ?? ""}
                onValueChange={setSelectedVehicleId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your Vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      License Plate: {v.license_plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="">
              {/* <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  value={vehicleInfo.make}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      make: e.target.value,
                    }))
                  }
                  placeholder="e.g., Toyota"
                />
                {errors.make && (
                  <p className="text-red-500 text-sm">{errors.make}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={vehicleInfo.model}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      model: e.target.value,
                    }))
                  }
                  placeholder="e.g., Camry"
                />
                {errors.model && (
                  <p className="text-red-500 text-sm">{errors.model}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={vehicleInfo.year}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      year: e.target.value,
                    }))
                  }
                  placeholder="e.g., 2020"
                />
                {errors.year && (
                  <p className="text-red-500 text-sm">{errors.year}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Color</Label>

                <Input
                  value={vehicleInfo.color}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      color: e.target.value,
                    }))
                  }
                  placeholder="e.g., Black,Red"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  If car has two colors separate it with comma ","
                </p>
                {errors.color && (
                  <p className="text-red-500 text-sm">{errors.color}</p>
                )}
              </div> */}

              {/* <div className="space-y-2">
                <Label>Body Type</Label>
                <Select
                  value={vehicleInfo.body_type}
                  onValueChange={(val) =>
                    setVehicleInfo((prev) => ({ ...prev, body_type: val }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Body Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.body_type && (
                  <p className="text-red-500 text-sm">{errors.body_type}</p>
                )}
              </div> */}

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
                  placeholder="e.g., ABC123 or leave it blank"
                  className="text-lg font-mono uppercase"
                />
                {errors.license_plate && (
                  <p className="text-red-500 text-sm">{errors.license_plate}</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6">
            <Button
              className="w-full bg-blue-900 text-white hover:bg-blue-800"
              onClick={handleBooking}
            >
              {subscriptionVehicles.length > 0
                ? "Proceed to services"
                : "See My Pricing"}
            </Button>
          </div>
        </div>
      </div>

      <AuthPromptModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
