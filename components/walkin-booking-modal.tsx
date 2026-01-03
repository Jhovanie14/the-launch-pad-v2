"use client";

import { useEffect, useState } from "react";
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
import {
  Calendar,
  Car,
  Check,
  Clock,
  Mail,
  Phone,
  User,
  CreditCard,
  Banknote,
} from "lucide-react";
import { useBookingForm } from "@/hooks/useBookingForm";
import { createClient } from "@/utils/supabase/client";
import { loadStripe } from "@stripe/stripe-js";

type WalkInBookingModalProps = {
  open: boolean;
  subscriber: any;
  onOpenChange: (v: boolean) => void;
  onBookingCreated?: () => void;
};

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

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

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Auto-fill vehicle info when subscriber changes
  useEffect(() => {
    if (!subscriber) return;

    async function loadVehicles() {
      const supabase = createClient();
      const { data } = await supabase
        .from("subscription_vehicles")
        .select("id, vehicles(*)")
        .eq("subscription_id", subscriber.id);

      const vehicleList =
        data?.map((v: any) => ({
          subscription_vehicle_id: v.id,
          ...v.vehicles,
        })) || [];

      setVehicles(vehicleList);

      if (vehicleList.length) {
        const firstVehicle = vehicleList[0];
        setSelectedVehicleId(firstVehicle.subscription_vehicle_id);
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

  const calculateAddOnsTotal = () => {
    const selectedAddOnObjs = addOns.filter((a) =>
      selectedAddOns.includes(a.id)
    );
    const total = selectedAddOnObjs.reduce(
      (sum, a) => sum + Number(a.price || 0),
      0
    );
    const details = selectedAddOnObjs.map((a) => ({
      name: a.name,
      price: Number(a.price || 0),
    }));

    return { total, details };
  };

  // Auto-select first service after services + vehicleInfo loaded
  useEffect(() => {
    if (!services.length || !vehicleInfo.body_type) return;
    if (!selectedService) {
      const filtered = services.filter(
        (s) =>
          s.category?.toLowerCase() === vehicleInfo.body_type?.toLowerCase()
      );
      if (filtered.length) setSelectedService(filtered[0].id);
    }
  }, [services, vehicleInfo.body_type, selectedService, setSelectedService]);

  const handleCreateBooking = async () => {
    const addOnsTotal = calculateAddOnsTotal().total;

    // If no add-ons or cash payment, create booking directly
    if (addOnsTotal === 0 || paymentMethod === "cash") {
      await handleSubmit({
        skipVehicleValidation: true,
        paymentMethod: "cash",
      });
      return;
    }

    // If card payment, redirect to Stripe
    if (paymentMethod === "card") {
      setProcessingPayment(true);

      try {
        // Create a checkout session
        const response = await fetch("/api/create-walkin-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: addOnsTotal,
            subscriber_id: subscriber.id,
            subscription_vehicle_id: selectedVehicleId,
            service_package_id: selectedService,
            add_on_ids: selectedAddOns,
            appointment_date: form.appointmentDate,
            appointment_time: form.appointmentTime,
            notes: form.notes,
            customer_email: subscriber.profiles.email,
            customer_name: subscriber.profiles.full_name,
          }),
        });

        const { sessionId } = await response.json();
        const stripe = await stripePromise;

        if (stripe) {
          await stripe.redirectToCheckout({ sessionId });
        }
      } catch (error) {
        console.error("Payment error:", error);
        alert("Failed to process payment. Please try again.");
      } finally {
        setProcessingPayment(false);
      }
    }
  };

  const addOnsTotal = calculateAddOnsTotal().total;
  const hasAddOns = selectedAddOns.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-0 shadow-elegant-lg">
        <DialogHeader className="space-y-3 pb-6 border-b border-border/50">
          <DialogTitle className="text-2xl font-semibold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
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
            <div className="flex flex-wrap items-center gap-3 bg-gray-300/20 py-3 px-4 rounded-md text-sm">
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
            {vehicles.length > 1 && (
              <div className="space-y-2">
                <Label>Select Vehicle</Label>
                <select
                  value={selectedVehicleId ?? ""}
                  onChange={(e) => {
                    const vehicle = vehicles.find(
                      (v) => v.subscription_vehicle_id === e.target.value
                    );
                    if (!vehicle) return;

                    setSelectedVehicleId(e.target.value);
                    setVehicleInfo({
                      year: vehicle.year,
                      make: vehicle.make,
                      model: vehicle.model,
                      body_type: vehicle.body_type,
                      color: vehicle.colors.join(","),
                    });
                  }}
                  className="w-full h-11 rounded-md bg-muted/30 border border-border/50 px-3 text-sm"
                >
                  {vehicles.map((v) => (
                    <option
                      key={v.subscription_vehicle_id}
                      value={v.subscription_vehicle_id}
                    >
                      {v.year} {v.make} {v.model} ({v.colors.join(", ")})
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              Service Package (Included in Subscription)
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
                        <span>{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            FREE
                          </span>
                          {selectedService === s.id && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1.5">
                      {s.features?.map((f: string, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
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
                Additional Services (Paid Add-Ons)
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
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{a.name}</span>
                      <span className="text-lg font-bold text-primary">
                        ₱{Number(a.price || 0).toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedAddOns.includes(a.id)}
                      onChange={() => toggleAddOn(a.id)}
                      className="w-5 h-5 text-primary border-border/50 rounded focus:ring-primary/20"
                    />
                  </label>
                ))}
              </div>

              {/* Payment Method Selection - Only show if add-ons selected */}
              {hasAddOns && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <Label className="text-sm font-medium">
                    Payment Method for Add-Ons
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === "cash"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 hover:border-primary/50"
                      }`}
                    >
                      <Banknote className="w-5 h-5" />
                      <span className="font-medium">Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === "card"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 hover:border-primary/50"
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="font-medium">Card</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Add-Ons Total */}
              {hasAddOns && (
                <Card className="border-2 border-primary/30 bg-linear-to-r from-primary/5 to-primary/10">
                  <CardContent className="py-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold">
                          Total Payment Required:
                        </span>
                        <span className="text-3xl font-bold text-primary">
                          ₱{addOnsTotal.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {paymentMethod === "cash"
                          ? "Payment will be collected at the counter"
                          : "You will be redirected to Stripe for secure payment"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
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
            onClick={handleCreateBooking}
            disabled={loading || processingPayment}
            className="w-full h-14 gradient-primary text-primary-foreground font-semibold text-lg shadow-elegant hover:shadow-lg transition-elegant disabled:opacity-50"
          >
            {loading || processingPayment ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {processingPayment
                  ? "Redirecting to payment..."
                  : "Creating Booking..."}
              </span>
            ) : hasAddOns && paymentMethod === "card" ? (
              <>
                Process Card Payment (₱{addOnsTotal.toFixed(2)})
                <span className="ml-2 text-xl">→</span>
              </>
            ) : hasAddOns && paymentMethod === "cash" ? (
              "Create Booking (Cash Payment)"
            ) : (
              "Create Walk-In Booking"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
