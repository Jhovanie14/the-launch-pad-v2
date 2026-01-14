"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Check, Ban, CreditCard, Banknote } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useBookingForm } from "@/hooks/useBookingForm";
import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function NewBookingModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
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
    resetForm,
    vehicleInfo,
    setVehicleInfo,
    errors,
  } = useBookingForm(() => {
    // Reset modal-specific state after successful booking
    setPromoCode("");
    setDiscountPercent(0);
    setPaymentMethod("cash");
    onOpenChange(false);
  });

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const supabase = createClient();

  const baseTotal = calculateTotal(
    selectedService,
    services,
    selectedAddOns,
    addOns
  );

  const totalAmount =
    discountPercent > 0
      ? baseTotal - (baseTotal * discountPercent) / 100
      : baseTotal;

  // Track previous open state to reset only when modal closes
  const prevOpenRef = useRef(open);

  // Reset form when modal closes
  useEffect(() => {
    // Only reset when modal transitions from open to closed
    if (prevOpenRef.current && !open) {
      resetForm();
      setPromoCode("");
      setDiscountPercent(0);
      setPaymentMethod("cash");
    }
    prevOpenRef.current = open;
  }, [open, resetForm]);

  const validatePromoCode = async () => {
    if (!promoCode) {
      toast.error("Please enter a promo code");
      return;
    }

    const { data, error } = await supabase
      .from("promo_codes")
      .select("discount_percent, is_active, applies_to")
      .ilike("code", promoCode.trim())
      .maybeSingle();

    if (error || !data) {
      toast.error("Invalid promo code");
      setDiscountPercent(0);
      return;
    }

    if (!data.is_active) {
      toast.error("This promo code is not active");
      setDiscountPercent(0);
      return;
    }

    if (data.applies_to !== "one_time" && data.applies_to !== "both") {
      toast.error("This promo code cannot be used for one-time bookings");
      setDiscountPercent(0);
      return;
    }

    setDiscountPercent(data.discount_percent);
    toast.success(`Promo applied! ${data.discount_percent}% off your total`);
  };

  const handleCreateBooking = async () => {
    // Validate required fields before proceeding
    if (!form.customerName || !form.customerEmail) {
      toast.error("Please fill in customer name and email");
      return;
    }

    if (!vehicleInfo.license_plate) {
      toast.error("Please fill in all required vehicle information");
      return;
    }

    if (!form.appointmentDate || !form.appointmentTime) {
      toast.error("Please select appointment date and time");
      return;
    }

    // If cash payment, create booking directly
    if (paymentMethod === "cash") {
      await handleSubmit({
        skipVehicleValidation: false,
        paymentMethod: "cash",
        discountPercent: discountPercent,
      });
      return;
    }

    // If card payment with amount > 0, redirect to Stripe
    if (paymentMethod === "card" && totalAmount > 0) {
      setProcessingPayment(true);

      try {
        const response = await fetch("/api/create-booking-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: totalAmount,
            customer_name: form.customerName,
            customer_email: form.customerEmail,
            customer_phone: form.customerPhone || "",

            vehicle_license_plate: vehicleInfo.license_plate || "",
            service_package_id: selectedService || "",
            add_on_ids: JSON.stringify(selectedAddOns),
            appointment_date: form.appointmentDate,
            appointment_time: form.appointmentTime,
            promo_code: promoCode || null,
            discount_percent: discountPercent || 0,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create checkout session");
        }

        const { sessionId } = await response.json();
        const stripe = await stripePromise;

        if (stripe) {
          await stripe.redirectToCheckout({ sessionId });
        }
      } catch (error) {
        console.error("Payment error:", error);
        toast.error("Failed to process payment. Please try again.");
      } finally {
        setProcessingPayment(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* CUSTOMER INFO */}
          <SectionTitle title="Customer Info" />
          <Input
            placeholder="Full Name *"
            value={form.customerName}
            onChange={(e) => handleChange("customerName", e.target.value)}
          />
          <Input
            placeholder="Email *"
            type="email"
            value={form.customerEmail}
            onChange={(e) => handleChange("customerEmail", e.target.value)}
          />
          <Input
            type="number"
            placeholder="Phone Number"
            value={form.customerPhone}
            onChange={(e) => handleChange("customerPhone", e.target.value)}
          />

          {/* VEHICLE INFO */}
          <SectionTitle title="Vehicle Info" />
          <div className="grid md:grid-cols-2 gap-4">
            <VehicleField
              label="License Plate"
              placeholder="e.g., ABC123"
              value={vehicleInfo.license_plate ?? ""}
              onChange={(val) =>
                setVehicleInfo((p) => ({ ...p, license_plate: val }))
              }
              error={errors.license_plate}
            />
          </div>

          {/* SERVICES */}
          <SectionTitle title="Service Packages" />

          {/* "No Service" Option */}
          <Card
            onClick={() => setSelectedService(null)}
            className={`cursor-pointer border-2 transition-all ${
              selectedService === null
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-blue-300"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Ban className="w-5 h-5 text-gray-500" />
                No Service Package
                <span className="ml-auto font-semibold text-gray-600">
                  $0.00
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-gray-600">
              <p>Select this if you only want add-ons (no main service)</p>
            </CardContent>
          </Card>

          {services.length === 0 ? (
            <p className="text-sm text-gray-500">
              No services available for this body type.
            </p>
          ) : (
            <div className="grid gap-3">
              {services.map((service) => (
                <Card
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`cursor-pointer border-2 transition-all ${
                    selectedService === service.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between text-base font-medium">
                      {service.name}
                      <span className="font-semibold">
                        ${service.price?.toFixed(2) ?? "0.00"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-gray-600">
                    {service.features?.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" /> {f}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ADD-ONS */}
          <SectionTitle title="Add-ons" />
          {addOns.length === 0 ? (
            <p className="text-sm text-gray-500">No add-ons available.</p>
          ) : (
            <div className="space-y-2">
              {addOns.map((a) => (
                <label
                  key={a.id}
                  className="flex justify-between items-center border p-2 rounded cursor-pointer hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-sm text-gray-500">
                      ${a.price?.toFixed(2) ?? "0.00"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedAddOns.includes(a.id)}
                    onChange={() => toggleAddOn(a.id)}
                    className="w-5 h-5 text-blue-600"
                  />
                </label>
              ))}
            </div>
          )}

          {/* APPOINTMENT */}
          <SectionTitle title="Appointment" />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={form.appointmentDate}
              onChange={(e) => handleChange("appointmentDate", e.target.value)}
            />
            <Input
              type="time"
              value={form.appointmentTime}
              onChange={(e) => handleChange("appointmentTime", e.target.value)}
            />
          </div>

          {/* PAYMENT METHOD */}
          <SectionTitle title="Payment Method" />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                paymentMethod === "cash"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-blue-300"
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
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">Card</span>
            </button>
          </div>

          {/* PROMO CODE */}
          <SectionTitle title="Promo Code (Optional)" />
          <div className="flex gap-2">
            <Input
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                // Clear discount if promo code is cleared
                if (!e.target.value) {
                  setDiscountPercent(0);
                }
              }}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={validatePromoCode}
              disabled={!promoCode}
            >
              Apply
            </Button>
            {discountPercent > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setPromoCode("");
                  setDiscountPercent(0);
                  toast.info("Promo code removed");
                }}
              >
                Clear
              </Button>
            )}
          </div>
          {discountPercent > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700 font-semibold">
                Promo applied: {discountPercent}% off — You save $
                {((baseTotal * discountPercent) / 100).toFixed(2)}
              </p>
            </div>
          )}

          {/* TOTAL AMOUNT */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <div className="flex flex-col items-end">
                {discountPercent > 0 && (
                  <span className="text-sm text-gray-500 line-through">
                    ${baseTotal.toFixed(2)}
                  </span>
                )}
                <span className="text-xl font-bold text-blue-900">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
            {selectedService === null && selectedAddOns.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Add-ons only (no service package)
              </p>
            )}
            {paymentMethod === "card" && totalAmount > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Customer will be redirected to Stripe for secure payment
              </p>
            )}
            {paymentMethod === "cash" && (
              <p className="text-xs text-gray-500 mt-2">
                Payment will be collected in person
              </p>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            onClick={handleCreateBooking}
            disabled={loading || processingPayment}
            className="w-full bg-blue-900 hover:bg-blue-700"
          >
            {loading || processingPayment ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {processingPayment
                  ? "Redirecting to payment..."
                  : "Creating..."}
              </span>
            ) : paymentMethod === "card" && totalAmount > 0 ? (
              `Process Card Payment ($${totalAmount.toFixed(2)})`
            ) : (
              "Create Booking"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Label className="text-md font-semibold mt-4 block">{title}</Label>;
}

function VehicleField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  helper,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="uppercase text-lg"
      />
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

function calculateTotal(
  selectedService: string | null,
  services: any[],
  selectedAddOns: string[],
  addOns: any[]
): number {
  const servicePrice = selectedService
    ? services.find((s) => s.id === selectedService)?.price || 0
    : 0;

  const addOnsTotal = addOns
    .filter((a) => selectedAddOns.includes(a.id))
    .reduce((sum, a) => sum + Number(a.price || 0), 0);

  return servicePrice + addOnsTotal;
}
