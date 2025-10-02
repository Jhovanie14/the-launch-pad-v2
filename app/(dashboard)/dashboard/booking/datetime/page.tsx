"use client";

import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  PackageCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const timeSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
];

function DateTimeSelectionPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<any>();

  const [vehicleSpecs, setVehicleSpecs] = useState<any>({
    year: searchParams.get("year"),
    make: searchParams.get("make"),
    model: searchParams.get("model"),
    trim: searchParams.get("trim"),
    body_type: searchParams.get("body_type"),
    color: searchParams.get("color"),
  });

  const serviceId = searchParams.get("service");
  const addonsParam = searchParams.get("addons");

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
    })();
  }, [serviceId, addonsParam, supabase]);

  useEffect(() => {
    if (selectedDate) {
      setAvailableSlots(timeSlots);
    }
  }, [selectedDate]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };
  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastTime = (time: string) => {
    if (!selectedDate || !isToday(selectedDate)) return false;

    const now = new Date();
    const [hours, minutes] = time.split(":").map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);

    return slotTime <= now;
  };

  const handleContinue = () => {
    try {
      if (selectedDate && selectedTime) {
        // console.log("vehicle", vehicleSpecs);
        // console.log("service", serviceId);
        // console.log("addons", addonsParam);
        // console.log("date", selectedDate.toISOString().split("T")[0]);
        // console.log("time", selectedTime);
        const params = new URLSearchParams(vehicleSpecs);
        params.set("service", serviceId || "");
        params.set("addons", addonsParam || "");
        params.set("date", selectedDate.toISOString().split("T")[0]);
        params.set("time", selectedTime);
        setLoading(true);
        router.push(`/dashboard/booking/confirmation?${params.toString()}`);
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const calculateDuration = () => {
    const base = Number(selectedPackages?.duration) || 0;
    const addOnsTotal = Number(selectedAddOns?.duration) || 0;

    return base + addOnsTotal;
  };

  if (loading) {
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
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-foreground font-sans">
                Select Date & Time
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Choose your preferred appointment slot
              </p>
            </div>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Select Your Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={{ before: new Date() }}
                    className="rdp-custom"
                    footer={
                      selectedDate ? (
                        <div className="text-center mt-4 p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium text-foreground">
                            Selected: {selectedDate.toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <div className="text-center mt-4 p-3 text-muted-foreground">
                          <span className="text-sm">Please select a date</span>
                        </div>
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Available Time Slots
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {availableSlots.map((time) => {
                      const isDisabled = isPastTime(time);
                      const isSelected = selectedTime === time;
                      return (
                        <Button
                          key={time}
                          onClick={() => !isDisabled && handleSelectTime(time)}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          disabled={isDisabled}
                          className={`h-12 font-medium transition-all duration-200 ${
                            isSelected
                              ? "bg-blue-900 hover:bg-blue-900/90 text-primary-foreground shadow-md scale-105 scale-text"
                              : isDisabled
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-blue-900 hover:text-primary-foreground hover:border-primary/50"
                          }`}
                        >
                          {time}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Select a date first</p>
                    <p className="text-sm">
                      Available time slots will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Progress Indicator */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Booking Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm">Service Package Selected</span>
                </div>
                <div className="ml-2 h-6 w-px bg-border" />
                <div className="flex items-center gap-3 text-primary font-medium">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm">Date and Time</span>
                </div>
                <div className="ml-2 h-6 w-px bg-border" />
                <div className="flex items-center gap-3 text-muted-foreground">
                  <PackageCheck className="w-5 h-5" />
                  <span className="text-sm">Confirmation & Payment</span>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Summary */}
            {selectedDate && selectedTime && (
              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Selected Appointment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col">
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        {formatDate(selectedDate)}
                      </div>
                      <div className="text-primary font-medium text-sm">
                        {selectedTime}
                      </div>
                    </div>
                    <div className="">
                      <div className="font-semibold text-foreground text-lg">
                        {calculateDuration()} min
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Service time
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Continue Button */}
            <Button
              disabled={!selectedDate || !selectedTime}
              className="w-full h-12 text-base font-semibold bg-blue-900 hover:bg-blue-900/90 text-primary-foreground shadow-md"
              onClick={handleContinue}
            >
              Continue to Confirmation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatetimeLoading() {
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

export default function ServicePage() {
  return (
    <Suspense fallback={<DatetimeLoading />}>
      <DateTimeSelectionPage />
    </Suspense>
  );
}
