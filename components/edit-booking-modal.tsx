"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Booking } from "@/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type EditBookingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onSuccess: () => void;
};

export default function EditBookingModal({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: EditBookingModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Booking details
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");

  // Vehicle details
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleBodyType, setVehicleBodyType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  // Customer details (read-only for context)
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Load booking data when modal opens
  useEffect(() => {
    if (booking && open) {
      setAppointmentDate(booking.appointment_date);
      setAppointmentTime(booking.appointment_time);
      setCustomerName(booking.customer_name || "");
      setCustomerEmail(booking.customer_email || "");
      setCustomerPhone(booking.customer_phone || "");

      // Load vehicle data
      if (booking.vehicle) {
        setVehicleMake(booking.vehicle.make || "");
        setVehicleModel(booking.vehicle.model || "");
        setVehicleYear(booking.vehicle.year?.toString() || "");

        // Handle colors - could be array or string
        const colors = booking.vehicle.colors;
        if (Array.isArray(colors)) {
          setVehicleColor(colors.join(", "));
        } else if (typeof colors === "string") {
          setVehicleColor(colors);
        } else {
          setVehicleColor("");
        }

        // setVehicleBodyType(booking.vehicle.body_type || "");
        // setLicensePlate(booking.vehicle.license_plate || "");
      }
    }
  }, [booking, open]);

  const handleSave = async () => {
    if (!booking) return;

    try {
      setLoading(true);

      const hasVehicle = !!booking.vehicle_id;

      let vehicleId = booking.vehicle_id;
      // Update vehicle
      const colors = vehicleColor.split(",").map((c) => c.trim());

      if (hasVehicle) {
        // UPDATE existing vehicle
        const { error } = await supabase
          .from("vehicles")
          .update({
            make: vehicleMake,
            model: vehicleModel,
            year: parseInt(vehicleYear),
            colors,
            license_plate: licensePlate,
            body_type: vehicleBodyType,
          })
          .eq("id", vehicleId);

        if (error) throw error;
      } else {
        // CREATE new vehicle
        const { data, error } = await supabase
          .from("vehicles")
          .insert({
            make: vehicleMake,
            model: vehicleModel,
            year: parseInt(vehicleYear),
            colors,
            license_plate: licensePlate,
            body_type: vehicleBodyType,
          })
          .select()
          .single();

        if (error) throw error;

        vehicleId = data.id;

        // Attach vehicle to booking
        const { error: bookingUpdateError } = await supabase
          .from("bookings")
          .update({ vehicle_id: vehicleId })
          .eq("id", booking.id);

        if (bookingUpdateError) throw bookingUpdateError;
      }

      // Update booking
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
        })
        .eq("id", booking.id);

      if (bookingError) {
        console.error("Error updating booking:", bookingError);
        toast.error("Failed to update booking");
        return;
      }

      toast.success("Booking updated successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving booking:", error);
      toast.error("An error occurred while updating the booking");
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info (Read-only) */}
          <div className="space-y-3">
            <Label className="text-md font-semibold">
              Customer Information
            </Label>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <strong>Name:</strong> {customerName}
              </p>
              <p className="text-sm">
                <strong>Email:</strong> {customerEmail}
              </p>
              {customerPhone && (
                <p className="text-sm">
                  <strong>Phone:</strong> {customerPhone}
                </p>
              )}
            </div>
          </div>

          {/* Appointment Date & Time */}
          <div className="space-y-3">
            <Label className="text-md font-semibold">Appointment Details</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="space-y-3">
            <Label className="text-md font-semibold">Vehicle Information</Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Make *</Label>
                <Input
                  placeholder="e.g., Toyota"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Model *</Label>
                <Input
                  placeholder="e.g., Camry"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Year *</Label>
                <Input
                  type="number"
                  placeholder="e.g., 2020"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Color *</Label>
                <Input
                  placeholder="e.g., Black, Red"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple colors with commas
                </p>
              </div>

              <div className="space-y-2">
                <Label>Body Type *</Label>
                <Select
                  value={vehicleBodyType}
                  onValueChange={setVehicleBodyType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Body Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Sedan",
                      "Compact Suv",
                      "Suvs",
                      "Small Truck",
                      "Big Truck",
                      "Van",
                    ].map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>License Plate</Label>
                <Input
                  placeholder="e.g., ABC123"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-900 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
