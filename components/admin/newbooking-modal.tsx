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
import { Check, Ban } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useBookingForm } from "@/hooks/useBookingForm";

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
    // Vehicle
    vehicleInfo,
    setVehicleInfo,
    errors,
  } = useBookingForm(() => onOpenChange(false));

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
            placeholder="Full Name"
            value={form.customerName}
            onChange={(e) => handleChange("customerName", e.target.value)}
          />
          <Input
            placeholder="Email"
            value={form.customerEmail}
            onChange={(e) => handleChange("customerEmail", e.target.value)}
          />
          <Input
            placeholder="Phone Number"
            value={form.customerPhone}
            onChange={(e) => handleChange("customerPhone", e.target.value)}
          />

          {/* VEHICLE INFO */}
          <SectionTitle title="Vehicle Info" />
          <div className="grid md:grid-cols-2 gap-4">
            <VehicleField
              label="Make"
              placeholder="e.g., Toyota"
              value={vehicleInfo.make}
              onChange={(val) => setVehicleInfo((p) => ({ ...p, make: val }))}
              error={errors.make}
            />

            <VehicleField
              label="Model"
              placeholder="e.g., Camry"
              value={vehicleInfo.model}
              onChange={(val) => setVehicleInfo((p) => ({ ...p, model: val }))}
              error={errors.model}
            />

            <VehicleField
              label="Year"
              placeholder="e.g., 2020"
              type="number"
              value={vehicleInfo.year}
              onChange={(val) => setVehicleInfo((p) => ({ ...p, year: val }))}
              error={errors.year}
            />

            <VehicleField
              label="Color"
              placeholder="e.g., Black, Red"
              value={vehicleInfo.color}
              onChange={(val) => setVehicleInfo((p) => ({ ...p, color: val }))}
              error={errors.color}
              helper="Separate multiple colors with commas."
            />

            <div className="space-y-2">
              <Label>Body Type</Label>
              <Select
                value={vehicleInfo.body_type}
                onValueChange={(val) =>
                  setVehicleInfo((p) => ({ ...p, body_type: val }))
                }
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
              {errors.body_type && (
                <p className="text-red-500 text-sm">{errors.body_type}</p>
              )}
            </div>

            <VehicleField
              label="License Plate"
              placeholder="e.g., ABC123"
              value={vehicleInfo.licensePlate ?? ""}
              onChange={(val) =>
                setVehicleInfo((p) => ({ ...p, licensePlate: val }))
              }
              error={errors.licensePlate}
            />
          </div>

          {/* SERVICES */}
          <SectionTitle title="Service Packages" />

          {/* 🔹 NEW: "No Service" Option */}
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
          <Select
            value={form.payment_method}
            onValueChange={(v) => handleChange("payment_method", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>

          {/* 🔹 Show selected total */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-xl font-bold text-blue-900">
                $
                {calculateTotal(
                  selectedService,
                  services,
                  selectedAddOns,
                  addOns
                ).toFixed(2)}
              </span>
            </div>
            {selectedService === null && selectedAddOns.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Add-ons only (no service package)
              </p>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            onClick={() => handleSubmit({ skipVehicleValidation: false })}
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-700"
          >
            {loading ? "Creating..." : "Create Booking"}
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
      />
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// 🔹 Helper function to calculate total
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
