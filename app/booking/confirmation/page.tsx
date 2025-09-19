"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  PackageCheck,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [vehicleSpecs, setVehicleSpecs] = useState<any>({
    year: searchParams.get("year"),
    make: searchParams.get("make"),
    model: searchParams.get("model"),
    trim: searchParams.get("trim"),
    body_type: searchParams.get("bodytype"),
    color: searchParams.get("color"),
  });
  const [selectedPackages, setSelectedPackages] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<any>(null);

  const serviceId = searchParams.get("service");
  const addonsParam = searchParams.get("addons");

  const [appointmentDate, setAppointmentDate] = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<string | null>(null);

  const dateParam = searchParams.get("date");
  const timeParam = searchParams.get("time");

  useEffect(() => {
    (async () => {
      if (serviceId) {
        const { data } = await supabase
          .from("service_packages")
          .select("*")
          .eq("id", serviceId)
          .single();

        setSelectedPackages(data);
      }

      if (addonsParam) {
        const { data } = await supabase
          .from("add_ons")
          .select("*")
          .eq("id", addonsParam)
          .single();

        setSelectedAddOns(data);
      }
      if (dateParam) {
        setAppointmentDate(dateParam);
      }

      if (timeParam) {
        setAppointmentTime(timeParam);
      }
    })();
  }, [serviceId, addonsParam, dateParam, timeParam, supabase]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateDuration = () => {
    const base = Number(selectedPackages?.duration) || 0;
    const addOnsTotal = Number(selectedAddOns?.duration) || 0;
    return base + addOnsTotal;
  };

  const calculateTotal = () => {
    const total = selectedPackages?.price || 0;
    const addOnsTotal = selectedAddOns?.price || 0;

    return total + addOnsTotal;
  };
  const handleConfirmBooking = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        year: parseInt(vehicleSpecs.year || "0"),
        make: vehicleSpecs.make || "",
        model: vehicleSpecs.model || "",
        trim: vehicleSpecs.trim || "",
        body_type: vehicleSpecs.body_type || "",
        colors: [vehicleSpecs.color || ""],
        vehicleSpecs,
        // Instead of passing the whole object:
        servicePackageId: selectedPackages!.id,
        servicePackageName: selectedPackages!.name,
        servicePackagePrice: selectedPackages!.price,

        addOnsId: selectedAddOns ? selectedAddOns.id : null,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime!.toString(),
        totalPrice: calculateTotal(),
        totalDuration: calculateDuration(),
      };
      const res = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { url } = await res.json();
      if (url) {
        window.location.href = url; // redirect to Stripe Checkout
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              Confirm Your Booking
            </h1>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className=" space-y-6">
            {/* Vehicle Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Car className="w-5 h-5 mr-2" />
                  Vehicle Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year:</span>
                    <span className="font-medium">{vehicleSpecs.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Make:</span>
                    <span className="font-medium">{vehicleSpecs.make}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-medium">{vehicleSpecs.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trim:</span>
                    <span className="font-medium">{vehicleSpecs.trim}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Color:</span>
                    <span className="font-medium">{vehicleSpecs.color}</span>
                  </div>
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
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {appointmentDate && formatDate(appointmentDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{appointmentTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">
                      {selectedPackages?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="pl-4 text-xs text-gray-600">
                      - Duration:
                    </span>
                    <span className="font-medium">
                      {Number(selectedPackages?.duration)} mins
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Add Ons:</span>
                    <span className="font-medium">
                      {selectedAddOns?.name ? selectedAddOns?.name : "none"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="pl-4 text-xs text-gray-600">
                      - Duration:
                    </span>
                    <span className="font-medium">
                      {selectedAddOns?.duration
                        ? selectedAddOns?.duration
                        : "0"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Whole Duration:</span>
                    <span className="font-medium">
                      {calculateDuration()} minutes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Price:</span>
                    <span className="font-medium">
                      ${calculateTotal()} price
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Action Buttons */}
            <div className="w-full md:flex space-y-3 md:space-y-0  md:justify-between">
              <Button variant="outline" className=" px-8 py-3">
                Back to Date & Time
              </Button>
              <Button
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="bg-blue-900 hover:bg-blue-800 px-8 py-3"
              >
                {isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {isSubmitting ? "Confirming..." : "Proceed to Payment"}
              </Button>
            </div>
          </div>
          <div className="space-y-4 hidden md:block">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Booking Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-muted-foreground space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm">Service Package Selected</span>
                </div>
                <div className="ml-2 h-8 w-px bg-gray-300" />
                <div className="flex items-center text-muted-foreground space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm">Date and Time</span>
                </div>
                <div className="ml-2 h-8 w-px bg-gray-300" />
                <div className="flex items-center text-primary space-x-3">
                  <PackageCheck className="w-5 h-5" />
                  <span className="text-sm">Confirmation</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmationLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-6 w-48 rounded"></div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="animate-pulse bg-white rounded-lg p-6 h-48"></div>
          <div className="animate-pulse bg-white rounded-lg p-6 h-64"></div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<ConfirmationLoading />}>
      <ConfirmationContent />
    </Suspense>
  );
}
