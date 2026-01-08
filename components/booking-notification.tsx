"use client";

import { X, Calendar, User, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "motion/react";
import type { Booking } from "@/types";
import { useRouter } from "next/navigation";

interface BookingNotificationProps {
  booking: Booking | null;
  onClose: () => void;
}

export function BookingNotification({
  booking,
  onClose,
}: BookingNotificationProps) {
  const router = useRouter();

  if (!booking) return null;

  const customerName = booking.customer_name || "Guest";
  const serviceName = booking.service_package_name || "Service";
  const appointmentTime = booking.appointment_time || "";

  const handleClick = () => {
    router.push("/admin/booking");
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 400, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 400, scale: 0.8 }}
        transition={{ duration: 0.3, type: "spring" }}
        className="fixed top-4 right-4 z-50 w-full max-w-md"
      >
        <Card className="border-blue-500 shadow-2xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div
                className="flex-1 space-y-2 cursor-pointer"
                onClick={handleClick}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <h3 className="font-semibold text-lg text-blue-900">
                    New Booking Received
                  </h3>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{customerName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700">
                    <Car className="w-4 h-4" />
                    <span>{serviceName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <span>{appointmentTime}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
