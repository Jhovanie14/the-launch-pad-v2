"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar, Car, Check, Clock, Mail, Phone, User } from "lucide-react";
import { useBookingForm } from "@/hooks/useBookingForm";
import { createClient } from "@/utils/supabase/client";

type WalkInBookingModalProps = {
  open: boolean;
  subscriber: any;
  onOpenChange: (v: boolean) => void;
  onBookingCreated?: () => void;
};

export default function WalkInBookingModal({
  open,
  subscriber,
  onOpenChange,
  onBookingCreated,
}: WalkInBookingModalProps) {
  const {
    loading,
    form,
    handleChange,
    services,
    addOns,
    selectedService,
    setSelectedService,
    selectedAddOns,
    toggleAddOn,
    handleSubmit,
    vehicleInfo,
    setVehicleInfo,
    errors,
  } = useBookingForm(() => {
    onOpenChange(false);
    onBookingCreated?.();
  }, subscriber);

  // Auto-fill vehicle info when subscriber changes
  useEffect(() => {
    if (!subscriber) return;

    async function loadVehicles() {
      const supabase = createClient();
      const { data } = await supabase
        .from("subscription_vehicles")
        .select("*, vehicles(*)")
        .eq("subscription_id", subscriber.id);

      const vehicles = data?.map((v: any) => v.vehicles) || [];

      if (vehicles.length) {
        const firstVehicle = vehicles[0];
        setVehicleInfo({
          year: firstVehicle.year,
          make: firstVehicle.make,
          model: firstVehicle.model,
          body_type: firstVehicle.body_type,
          color: firstVehicle.colors.join(","),
        });
      }
    }

    loadVehicles();

    handleChange("customerName", subscriber.profiles.full_name);
    handleChange("customerEmail", subscriber.profiles.email);
    handleChange("customerPhone", subscriber.profiles.phone || "");
  }, [subscriber, setVehicleInfo]);

  // Auto-select first service after services + vehicleInfo loaded
  useEffect(() => {
    if (!services.length || !vehicleInfo.body_type) return;
    if (!selectedService) {
      const filtered = services.filter(
        (s) => s.category?.toLowerCase() === vehicleInfo.body_type.toLowerCase()
      );
      if (filtered.length) setSelectedService(filtered[0].id);
    }
  }, [services, vehicleInfo.body_type, selectedService, setSelectedService]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-0 shadow-elegant-lg">
        <DialogHeader className="space-y-3 pb-6 border-b border-border/50">
          <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Walk-In Booking
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Express Subscriber Service
          </p>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Customer Information
            </h3>
            <div className="flex items-center gap-2 bg-gray-300/20 py-2 px-3 rounded-md text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span>{subscriber.profiles.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>{subscriber.profiles.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>{subscriber.profiles.phone || "-"}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              Vehicle Details
            </h3>
            <div className="flex items-center gap-2 bg-gray-300/20 py-2 px-3 rounded-md text-sm">
              <span>
                {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model} -{" "}
                {vehicleInfo.body_type || "-"} ({vehicleInfo.color || "-"})
              </span>
            </div>
          </div>

          {/* Service Packages */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">
              Service Package
            </h3>
            {services.length === 0 ? (
              <Card className="border-dashed border-2 border-border/50 bg-muted/20">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No services available for this vehicle type
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {services.map((s) => (
                  <Card
                    key={s.id}
                    className={`cursor-pointer transition-elegant hover:shadow-md ${
                      selectedService === s.id
                        ? "border-2 border-primary bg-accent/30 shadow-elegant"
                        : "border border-border/50 hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedService(s.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center justify-between">
                        {s.name}
                        {selectedService === s.id && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1.5">
                      {s.features?.map((f: string, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add-Ons */}
          {addOns.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">
                Additional Services
              </h3>
              <div className="grid gap-2">
                {addOns.map((a) => (
                  <label
                    key={a.id}
                    className={`flex justify-between items-center p-4 border rounded-lg cursor-pointer transition-elegant ${
                      selectedAddOns.includes(a.id)
                        ? "border-primary bg-accent/20 shadow-sm"
                        : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-sm font-medium">{a.name}</span>
                    <input
                      type="checkbox"
                      checked={selectedAddOns.includes(a.id)}
                      onChange={() => toggleAddOn(a.id)}
                      className="w-4 h-4 text-primary border-border/50 rounded focus:ring-primary/20"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Appointment Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Appointment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="date"
                  className="text-sm font-medium text-muted-foreground flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={form.appointmentDate}
                  onChange={(e) =>
                    handleChange("appointmentDate", e.target.value)
                  }
                  className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 transition-elegant"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="time"
                  className="text-sm font-medium text-muted-foreground flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={form.appointmentTime}
                  onChange={(e) =>
                    handleChange("appointmentTime", e.target.value)
                  }
                  className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 transition-elegant"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label
              htmlFor="notes"
              className="text-sm font-medium text-muted-foreground"
            >
              Additional Notes
            </Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 transition-elegant"
              placeholder="Any special requests or notes..."
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={() => handleSubmit({ skipVehicleValidation: true })}
            disabled={loading}
            className="w-full h-12 gradient-primary text-primary-foreground font-medium shadow-elegant hover:shadow-lg transition-elegant disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Creating Booking...
              </span>
            ) : (
              "Create Walk-In Booking"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
