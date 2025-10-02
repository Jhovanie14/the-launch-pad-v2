"use client";

import { useBooking } from "@/context/bookingContext";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useEffect, useState } from "react";
import AuthPromptModal from "./user/authPromptModal";
import { carApiService } from "@/lib/services/carapi";
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

export default function BookingModal() {
  const { isBookingModalOpen, closeBookingModal } = useBooking();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const { vehicleInfo, setVehicleInfo, errors, validate } = useVehicleForm();

  if (!isBookingModalOpen) return null;

  const handleBooking = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    if (!validate()) return;

    closeBookingModal();

    // Build URL with vehicle specs
    const params = new URLSearchParams({
      ...vehicleInfo,
    });

    // Redirect to service selection page
    window.location.href = `/dashboard/booking/service?${params.toString()}`;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-xl mx-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold">Enter your vehicle info</h2>
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
            Provide your car details to see pricing for your vehicle type
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Make</Label>
              <Input
                value={vehicleInfo.make}
                onChange={(e) =>
                  setVehicleInfo((prev) => ({ ...prev, make: e.target.value }))
                }
                placeholder="e.g., Toyota"
              />
              {errors.make && (
                <p className="text-red-500 text-sm">{errors.make}</p>
              )}
            </div>

            <div>
              <Label>Model</Label>
              <Input
                value={vehicleInfo.model}
                onChange={(e) =>
                  setVehicleInfo((prev) => ({ ...prev, model: e.target.value }))
                }
                placeholder="e.g., Camry"
              />
              {errors.model && (
                <p className="text-red-500 text-sm">{errors.model}</p>
              )}
            </div>

            <div>
              <Label>Year</Label>
              <Input
                type="number"
                value={vehicleInfo.year}
                onChange={(e) =>
                  setVehicleInfo((prev) => ({ ...prev, year: e.target.value }))
                }
                placeholder="e.g., 2020"
              />
              {errors.year && (
                <p className="text-red-500 text-sm">{errors.year}</p>
              )}
            </div>

            <div>
              <Label>Color</Label>
              <Input
                value={vehicleInfo.color}
                onChange={(e) =>
                  setVehicleInfo((prev) => ({ ...prev, color: e.target.value }))
                }
                placeholder="e.g., Silver"
              />
              {errors.color && (
                <p className="text-red-500 text-sm">{errors.color}</p>
              )}
            </div>

            <div>
              <Label>Trim</Label>
              <Input
                value={vehicleInfo.trim}
                onChange={(e) =>
                  setVehicleInfo((prev) => ({ ...prev, trim: e.target.value }))
                }
                placeholder="e.g., XLE"
              />
              {errors.trim && (
                <p className="text-red-500 text-sm">{errors.trim}</p>
              )}
            </div>

            <div>
              <Label>Body Type</Label>
              <Select
                value={vehicleInfo.body_type}
                onValueChange={(val) =>
                  setVehicleInfo((prev) => ({ ...prev, body_type: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Body Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Truck">Truck</SelectItem>
                  <SelectItem value="Coupe">Coupe</SelectItem>
                </SelectContent>
              </Select>
              {errors.body_type && (
                <p className="text-red-500 text-sm">{errors.body_type}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label>License Plate</Label>
              <Input
                value={vehicleInfo.licensePlate}
                onChange={(e) =>
                  setVehicleInfo((prev) => ({
                    ...prev,
                    licensePlate: e.target.value,
                  }))
                }
                placeholder="e.g., ABC123"
              />
              {errors.licensePlate && (
                <p className="text-red-500 text-sm">{errors.licensePlate}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Button
              className="w-full bg-blue-900 text-white hover:bg-blue-800"
              onClick={handleBooking}
            >
              See My Pricing
            </Button>
          </div>
        </div>
      </div>

      <AuthPromptModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
