"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Car } from "lucide-react";
import type { VehicleDisplay } from "@/app/actions/vehicle";
import type { AddOnRow, ServicePackageRow } from "@/types/db";
import type { DisplayPricing } from "@/lib/booking/pricingDisplay";
import { HOLIDAY_SALE_ACTIVE } from "@/lib/booking/holidaySale";

interface BookingSummaryProps {
  licensePlate: string;
  vehicleInfo: VehicleDisplay | null;
  service: ServicePackageRow | null;
  addOns: AddOnRow[];
  date: string | null;
  time: string | null;
  duration: number;
  pricing: DisplayPricing;
  promoApplied: boolean;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

export default function BookingSummary({
  licensePlate,
  vehicleInfo,
  service,
  addOns,
  date,
  time,
  duration,
  pricing,
  promoApplied,
}: BookingSummaryProps) {
  return (
    <>
      {/* Vehicle Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Car className="w-5 h-5 mr-2" />
            Vehicle Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {(licensePlate || vehicleInfo?.license_plate) && (
              <div className="flex justify-between">
                <span className="text-gray-600">License Plate:</span>
                <span className="font-mono font-semibold tracking-widest">
                  {licensePlate || vehicleInfo?.license_plate}
                </span>
              </div>
            )}
            {vehicleInfo?.year && (
              <div className="flex justify-between">
                <span className="text-gray-600">Year:</span>
                <span className="font-medium">{vehicleInfo.year}</span>
              </div>
            )}
            {vehicleInfo?.make && (
              <div className="flex justify-between">
                <span className="text-gray-600">Make:</span>
                <span className="font-medium">{vehicleInfo.make}</span>
              </div>
            )}
            {vehicleInfo?.model && (
              <div className="flex justify-between">
                <span className="text-gray-600">Model:</span>
                <span className="font-medium">{vehicleInfo.model}</span>
              </div>
            )}
            {vehicleInfo?.body_type && (
              <div className="flex justify-between">
                <span className="text-gray-600">Body Type:</span>
                <span className="font-medium">{vehicleInfo.body_type}</span>
              </div>
            )}
            {(vehicleInfo?.colors?.length ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Color:</span>
                <span className="font-medium">
                  {vehicleInfo?.colors?.join(", ")}
                </span>
              </div>
            )}
            {!licensePlate && !vehicleInfo && (
              <p className="text-gray-400 text-sm">No vehicle info available.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-800 font-medium">Date:</span>
              <span className="font-medium">{date && formatDate(date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-800 font-medium">Time:</span>
              {time && <span className="font-medium">{formatTime(time)}</span>}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-800 font-medium">Service:</span>
              <span className="font-medium">{service?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="pl-4 text-xs text-gray-600">- Duration:</span>
              <span className="font-medium">
                {Number(service?.duration)} mins
              </span>
            </div>
            {/* Service price row */}
            <div className="flex justify-between">
              <span className="text-slate-800 font-medium">Service:</span>
              {pricing.isServiceFree ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 line-through">
                    ${Number(service?.price).toFixed(2)}
                  </span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </div>
              ) : (
                <span className="font-medium">
                  ${Number(service?.price).toFixed(2)}
                </span>
              )}
            </div>

            {/* Add-ons with prices */}
            <div className="flex flex-col">
              <span className="text-slate-800 font-medium">Add Ons:</span>
              {addOns.length > 0 ? (
                addOns.map((addon) => (
                  <div
                    key={addon.id}
                    className="flex justify-between pl-4 text-sm text-gray-600"
                  >
                    <span>{addon.name}</span>
                    <span className="font-medium text-gray-800">
                      ${Number(addon.price).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between pl-4 text-sm text-gray-500">
                  <span className="font-medium">None</span>
                  <span className="font-medium">—</span>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <span className="text-slate-800 font-medium">Duration:</span>
              <span className="font-medium">{duration} minutes</span>
            </div>

            <div className="flex justify-between border-t pt-2 mt-1">
              <span className="text-slate-800 font-semibold">Total:</span>
              <div className="flex flex-col items-end">
                {HOLIDAY_SALE_ACTIVE && !pricing.isServiceFree && (
                  <span className="text-xs text-gray-400 line-through">
                    ${pricing.originalTotal.toFixed(2)}
                  </span>
                )}
                <span className="font-semibold text-base">
                  ${pricing.finalTotal.toFixed(2)}
                </span>
                {pricing.isServiceFree && addOns.length > 0 && (
                  <span className="text-xs text-green-600">
                    Service covered by subscription
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
