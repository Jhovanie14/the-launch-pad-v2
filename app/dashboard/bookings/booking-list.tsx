"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Car, DollarSign, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Booking {
  id: string;
  vehicle_id: string;
  service_package_name: string;
  service_package_price: number;
  payment_intent_id: string;
  add_ons: {
    name: string;
    price: number;
  };
  appointment_date: string;
  appointment_time: string;
  total_price: number;
  total_duration: number;
  status: string;
  created_at: string;
  vehicles: {
    year: number;
    make: string;
    model: string;
    trim: string;
    colors: string[];
  };
}

export default function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const [uid, setUid] = useState<string | null>(null);

  // Get user id + initial fetch
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ?? null;
      setUid(userId);
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            vehicles ( year, make, model, trim, body_type, colors ),
            add_ons ( name, price )
          `
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      } catch (e) {
        console.error("Error fetching bookings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Realtime channel (only this user's bookings)
  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel(`bookings:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `user_id=eq.${uid}`,
        },
        (payload: any) => {
          console.log(payload);
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          setBookings((curr) => {
            switch (payload.eventType) {
              case "INSERT":
                return [newRow, ...curr];
              case "UPDATE":
                return curr.map((b) =>
                  b.id === newRow.id ? { ...b, ...newRow } : b
                );
              case "DELETE":
                return curr.filter((b) => b.id !== (oldRow?.id ?? newRow?.id));
              default:
                return curr;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, uid]);

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

  if (loading) {
    return <div className="p-6">Loading bookings...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings Dashboard</h1>
        <p className="text-gray-600">
          Manage customer appointments and services
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {bookings.map((booking) => (
          <Card key={booking.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Booking #{booking.payment_intent_id}
                </CardTitle>
                <Badge className={getStatusColor(booking.status)}>
                  {booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vehicle Info */}
              <div className="flex items-center text-sm text-gray-600">
                <Car className="w-4 h-4 mr-2" />
                <span>
                  {booking.vehicles.year} {booking.vehicles.make}{" "}
                  {booking.vehicles.model}
                </span>
              </div>
              <div className="text-sm text-gray-600 ml-6">
                {booking.vehicles.trim} • {booking.vehicles.colors.join(", ")}
              </div>

              {/* Service Info */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="font-medium text-blue-900">
                  {booking.service_package_name}
                </div>
                <div className="text-sm text-blue-700">
                  ${booking.service_package_price}
                </div>
              </div>

              {/* Add-ons */}
              {booking.add_ons && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Add-ons:
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        + {booking.add_ons.name}
                      </span>
                      <span className="font-medium">
                        +${booking.add_ons.price}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Appointment Details */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(booking.appointment_date)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {booking.appointment_time} ({booking.total_duration} min)
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <div className="flex items-center text-green-600">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {booking.total_price}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  View Details
                </Button>
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
    </div>
  );
}
