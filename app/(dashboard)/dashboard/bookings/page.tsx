"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Car, DollarSign, Crown } from "lucide-react";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { ReviewForm } from "@/components/user/review-form";
import { useAuth } from "@/context/auth-context";
import { useBookingDetails } from "@/hooks/useBookingDetails";
import { redirect } from "next/navigation";

export default function BookingsList() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    bookings,
    loading,
    reviewedBookings,
    setReviewedBookings,
    setBookings,
    checkReviews,
  } = useBookingDetails();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );
  // Realtime channel (only this user's bookings)
  useBookingRealtime(setBookings);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
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

  if (loading) {
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

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings Dashboard</h1>
        <p className="text-gray-600">
          Manage customer appointments and services
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {bookings.map((booking) => (
          <Card key={booking.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-end mb-2">
                <Badge className={getStatusColor(booking.status)}>
                  {booking.status}
                </Badge>
              </div>
              <div className="flex items-center">
                <CardTitle>Booking #{booking.id}</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col h-full space-y-4">
              {/* Vehicle Info */}
              <div className="flex items-center text-sm text-gray-600">
                <Car className="w-4 h-4 mr-2" />
                <span>
                  {booking.vehicle?.year} {booking.vehicle?.make}{" "}
                  {booking.vehicle?.model}
                </span>
              </div>
              <div className="text-sm text-gray-600 ml-6">
                {booking.vehicle?.trim} • {booking.vehicle?.colors}
              </div>

              {/* Service Info */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="font-medium text-blue-900 mb-2">
                  {booking.service_package_name}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-blue-700">
                    {Number(booking.service_package_price) === 0
                      ? "Free"
                      : `$${booking.service_package_price}`}
                  </p>
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              {/* Add-ons */}
              {booking.add_ons && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Add-ons:
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      + {booking.add_ons.name}
                    </span>
                    <span className="font-medium">
                      +${booking.add_ons.price}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2 flex justify-between text-sm">
                <span className="text-sm font-medium text-gray-700 mb-2">
                  Payment Type
                </span>
                <span className="text-gray-600">{booking.payment_method}</span>
              </div>

              {/* Appointment Details */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(booking.appointment_date)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {formatTime(booking.appointment_time)} (
                  {booking.total_duration} min)
                </div>
              </div>

              <div className="flex-1" />

              {/* Total */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <div className="flex items-center text-green-600">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {Number(booking.total_price).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {booking.status === "completed" &&
                !reviewedBookings[booking.id] ? (
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    onClick={() => setSelectedBookingId(booking.id)}
                  >
                    Submit Review
                  </Button>
                ) : reviewedBookings[booking.id] ? (
                  <span className="w-full text-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Reviewed ✅
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className={`flex-1 ${
                      booking.status === "confirmed"
                        ? "text-blue-900 border-blue-900"
                        : ""
                    }`}
                  >
                    {booking.status === "pending"
                      ? "Waiting for confirmation"
                      : booking.status === "confirmed"
                        ? "Booking Confirmed!"
                        : ""}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bookings.length === 0 && (
        <div className="text-center py-12">
          <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No bookings yet
          </h3>
          <p className="text-gray-600">
            Customer bookings will appear here once they start booking services.
          </p>
        </div>
      )}

      {/* Review Modal */}
      {user && selectedBookingId && (
        <ReviewForm
          bookingId={selectedBookingId}
          userId={user.id}
          open={!!selectedBookingId}
          onOpenChange={() => setSelectedBookingId(null)}
          onSubmitted={async () => {
            setSelectedBookingId(null);

            setReviewedBookings((prev) => ({
              ...prev,
              [selectedBookingId!]: true,
            }));

            await checkReviews();
          }}
        />
      )}
    </div>
  );
}
