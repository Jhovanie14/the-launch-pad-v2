"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Banknote,
  Repeat,
  Car,
  Calendar,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type WalkInProgressModalProps = {
  open: boolean;
  subscriber: any; // The subscriber object
  onClose: () => void;
  onStatusChange?: () => void;
};

type Booking = {
  id: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  service_package_name: string;
  appointment_date: string;
  appointment_time: string;
  total_duration: number;
  total_price: number;
  payment_method: string;
  attendant_name?: string;
  confirmed_at?: string;
  completed_at?: string;
  notes?: string;
  vehicle?: any;
  add_ons?: any[];
};

export default function WalkInProgressModal({
  open,
  subscriber,
  onClose,
  onStatusChange,
}: WalkInProgressModalProps) {
  const supabase = createClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingBookings, setFetchingBookings] = useState(true);

  // Fetch all bookings for this subscriber
  useEffect(() => {
    if (!open || !subscriber) return;

    async function fetchBookings() {
      setFetchingBookings(true);
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            vehicle:vehicles (year, make, model, body_type, colors,license_plate),
            booking_add_ons (
              add_ons (id, name, price, duration, is_active)
            )
          `,
          )
          .eq("user_id", subscriber.user_id)
          .order("appointment_date", { ascending: false })
          .order("appointment_time", { ascending: false });

        if (error) {
          console.error("Error fetching bookings:", error);
          toast.error("Failed to fetch bookings");
          return;
        }

        const formatted = (data || []).map((b) => ({
          ...b,
          add_ons:
            b.booking_add_ons?.map((ba: any) => ba.add_ons).filter(Boolean) ||
            [],
        }));

        setBookings(formatted);
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong");
      } finally {
        setFetchingBookings(false);
      }
    }

    fetchBookings();
  }, [open, subscriber, supabase]);

  const getProgressValue = (status: string) => {
    switch (status) {
      case "pending":
        return 33.3;
      case "confirmed":
        return 66.6;
      case "completed":
        return 100;
      case "cancelled":
        return 0;
      default:
        return 0;
    }
  };

  const getProgressLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "confirmed":
        return "In Progress";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getCompletionTime = (booking: Booking) => {
    if (
      booking.status !== "completed" ||
      !booking.confirmed_at ||
      !booking.completed_at
    )
      return null;

    const diffMs =
      new Date(booking.completed_at).getTime() -
      new Date(booking.confirmed_at).getTime();

    const diffSec = diffMs / 1000;
    if (diffSec < 60) return `${diffSec.toFixed(0)} sec`;

    const diffMin = diffSec / 60;
    if (diffMin < 60) return `${diffMin.toFixed(0)} min`;

    const diffHr = diffMin / 60;
    return `${diffHr.toFixed(1)} hr`;
  };

  const updateStatus = async (bookingId: string, newStatus: string) => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const attendantName =
        userData.user?.user_metadata?.full_name ?? "Unknown";

      const updates: any = {
        status: newStatus,
        attendant_name: attendantName,
      };

      if (newStatus === "confirmed") {
        updates.confirmed_at = new Date().toISOString();
      }

      if (newStatus === "completed") {
        updates.completed_at = new Date().toISOString();

        // Send tip email and invoice
        const booking = bookings.find((b) => b.id === bookingId);
        if (booking?.customer_email) {
          await Promise.all([
            fetch("/api/send-tip-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: booking.customer_email,
                name: booking.customer_name,
                bookingId: booking.id,
              }),
            }),
            fetch("/api/send-invoice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: booking.customer_email,
                name: booking.customer_name,
                bookingId: booking.id,
              }),
            }),
          ]);
        }
      }

      if (newStatus === "cancelled") {
        updates.canceled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", bookingId);

      if (error) {
        console.error("Error updating booking:", error);
        toast.error("Failed to update booking");
        return;
      }

      // Update local state
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, ...updates } : b)),
      );

      toast.success(`Booking ${newStatus}`);
      onStatusChange?.();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Manage Walk-In Bookings - {subscriber?.profiles?.full_name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {subscriber?.profiles?.email}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {fetchingBookings ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-4">
                Loading bookings...
              </p>
            </div>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No bookings found for this subscriber
                </p>
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking) => (
              <Card
                key={booking.id}
                className={`border-2 transition-all ${
                  booking.status === "confirmed"
                    ? "border-blue-300 bg-blue-50/50"
                    : booking.status === "completed"
                      ? "border-green-300 bg-green-50/50"
                      : "border-border"
                }`}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {booking.service_package_name}
                        </h3>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Booking #{booking.id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ${booking.total_price}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.total_duration} mins
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(
                            new Date(booking.appointment_date),
                            "MMM dd, yyyy",
                          )}
                        </span>
                        <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                        <span>{formatTime(booking.appointment_time)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Car className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {booking.vehicle?.year} {booking.vehicle?.make}{" "}
                          {booking.vehicle?.model} -{" "}
                          {booking.vehicle?.body_type}
                          {booking.vehicle?.colors}
                          {booking.vehicle?.license_plate}
                        </span>
                      </div>

                      {booking.customer_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{booking.customer_phone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        {booking.payment_method === "card" && (
                          <CreditCard className="w-4 h-4 text-blue-500" />
                        )}
                        {booking.payment_method === "cash" && (
                          <Banknote className="w-4 h-4 text-green-500" />
                        )}
                        {booking.payment_method === "subscription" && (
                          <Repeat className="w-4 h-4 text-purple-500" />
                        )}
                        <span className="capitalize">
                          {booking.payment_method}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {booking.attendant_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>
                            <strong>Attendant:</strong> {booking.attendant_name}
                          </span>
                        </div>
                      )}

                      {booking.add_ons && booking.add_ons.length > 0 && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">Add-Ons:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {booking.add_ons.map((addon: any) => (
                              <li key={addon.id}>
                                {addon.name} (${addon.price})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {booking.notes && (
                        <div className="text-sm">
                          <p className="font-medium">Notes:</p>
                          <p className="text-muted-foreground italic">
                            "{booking.notes}"
                          </p>
                        </div>
                      )}

                      {booking.status === "completed" && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="font-medium">
                            Completed in: {getCompletionTime(booking)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                      <span>{getProgressLabel(booking.status)}</span>
                      <span>
                        {getProgressValue(booking.status).toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={getProgressValue(booking.status)}
                      className={`h-2 ${
                        booking.status === "completed"
                          ? "bg-green-200"
                          : booking.status === "confirmed"
                            ? "bg-blue-200"
                            : booking.status === "pending"
                              ? "bg-yellow-200"
                              : "bg-red-200"
                      }`}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {booking.status === "pending" && (
                      <Button
                        disabled={loading}
                        onClick={() => updateStatus(booking.id, "confirmed")}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Start Service
                      </Button>
                    )}
                    {booking.status === "confirmed" && (
                      <Button
                        disabled={loading}
                        onClick={() => updateStatus(booking.id, "completed")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Service
                      </Button>
                    )}
                    {(booking.status === "pending" ||
                      booking.status === "confirmed") && (
                      <Button
                        disabled={loading}
                        variant="destructive"
                        onClick={() => updateStatus(booking.id, "cancelled")}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
