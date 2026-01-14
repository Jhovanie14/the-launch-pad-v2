"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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
import { AddOn } from "@/types";
import LoadingDots from "@/components/loading";

const timeSlots = [
  "9:00",
  "9:30",
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
    license_plate: searchParams.get("license_plate"),
  });

  const serviceId = searchParams.get("service");
  const addonsParam = searchParams.get("addons");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedDate && bottomRef.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime && summaryRef.current) {
      // Only scroll on mobile/tablet screens
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          summaryRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
      }
    }
  }, [selectedTime]);

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
        const ids = addonsParam.split(",").filter(Boolean);

        if (ids.length > 0) {
          const { data, error } = await supabase
            .from("add_ons")
            .select("*")
            .in("id", ids); // ✅ handles multiple IDs safely

          if (error) {
            console.error("Error fetching add-ons:", error);
          } else {
            setSelectedAddOns(data);
          }
        }
        // const { data } = await supabase
        //   .from("add_ons")
        //   .select("*")
        //   .eq("id", addonsParam)
        //   .single();

        // setSelectedAddOns(data);
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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formateLocaleDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getChicagoTime = () => {
    const now = new Date();
    const chicagoStr = now.toLocaleString("en-US");
    return new Date(chicagoStr);
  };

  const isToday = (date: Date) => {
    const chicagoNow = getChicagoTime();
    const chicagoDate = new Date(date.toLocaleString("en-US"));

    return (
      chicagoNow.getFullYear() === chicagoDate.getFullYear() &&
      chicagoNow.getMonth() === chicagoDate.getMonth() &&
      chicagoNow.getDate() === chicagoDate.getDate()
    );
  };

  const isPastTime = (time: string) => {
    if (!selectedDate || !isToday(selectedDate)) return false;

    // Get current Chicago time
    const chicagoNow = getChicagoTime();

    // Extract year, month, and day from selected date in Chicago
    const chicagoDate = new Date(selectedDate.toLocaleString("en-US"));

    // Build the time slot in the same Chicago timezone context
    const [hours, minutes] = time.split(":").map(Number);
    const chicagoSlot = new Date(
      chicagoDate.getFullYear(),
      chicagoDate.getMonth(),
      chicagoDate.getDate(),
      hours,
      minutes,
      0,
      0
    );

    // Compare both in Chicago local time
    return chicagoSlot <= chicagoNow;
  };

  // const isToday = (date: Date) => {
  //   const today = new Date();
  //   return date.toDateString() === today.toDateString();
  // };

  // const isPastTime = (time: string) => {
  //   if (!selectedDate || !isToday(selectedDate)) return false;

  //   const now = new Date();
  //   const [hours, minutes] = time.split(":").map(Number);
  //   const slotTime = new Date();
  //   slotTime.setHours(hours, minutes, 0, 0);

  //   return slotTime <= now;
  // };

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
        params.set("date", formateLocaleDate(selectedDate));
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
    const addOnsTotal = ((selectedAddOns as AddOn[]) || []).reduce(
      (sum: number, addOn: AddOn) => sum + Number(addOn.duration),
      0
    );

    return base + addOnsTotal;
  };

  if (loading) {
    return <LoadingDots />;
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
              onClick={() => router.back()}
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
                    // disabled={[{ before: new Date() }, { dayOfWeek: [0, 6] }]}
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

            <Card ref={bottomRef} className="border-border shadow-sm">
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
                          {formatTime(time)}
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

          <div ref={summaryRef} className="space-y-6">
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

export default function ServicePage() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <DateTimeSelectionPage />
    </Suspense>
  );
}
