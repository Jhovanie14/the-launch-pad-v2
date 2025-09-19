"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Mail,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Booking {
  id: string;
  vehicle_id: string;
  user_id: string;
  service_package_name: string;
  service_package_price: number;
  payment_intent_id: string;
  add_ons?: {
    name: string;
    price: number;
    duration: number;
  };
  appointment_date: string;
  appointment_time: string;
  total_price: number;
  total_duration: number;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  vehicles: {
    year: number;
    make: string;
    model: string;
    trim: string;
    colors: string[];
  };
  notes?: string;
  special_instruction?: string;
}

export default function BookingsView() {
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const supabase = createClient();

  const fetchBookings = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: true });

    setLoading(false);

    if (error) console.error(error);
    setBookings(data || []);

    console.log("all bookings", bookings);
    console.log("data", data);
  }, [supabase]);

  useEffect(() => {
    fetchBookings();
    console.log(bookings);
  }, [fetchBookings]);

  // Realtime updates for bookings table
  useEffect(() => {
    const channel = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload: any) => {
          setBookings((current) => {
            console.log(payload);
            const newRow = payload.new as any;
            const oldRow = payload.old as any;
            switch (payload.eventType) {
              case "INSERT":
                return [newRow, ...current];
              case "UPDATE":
                return current.map((b) =>
                  b.id === newRow.id ? { ...b, ...newRow } : b
                );
              case "DELETE":
                return current.filter(
                  (b) => b.id !== (oldRow?.id ?? newRow?.id)
                );
              default:
                return current;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const getBookingsForDate = (date: string) => {
    return bookings.filter((booking) => booking.appointment_date === date);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      setLoading(true);
      const updates: Record<string, any> = { status: newStatus };

      if (newStatus === "confirmed") {
        updates.confirmed_at = new Date().toISOString();
      }

      if (newStatus === "completed") {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", bookingId);

      if (error) {
        console.error("Error updating booking:", error);
        return null;
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Booking Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <Label htmlFor="date-filter">Filter by Date</Label>
            <Input
              id="date-filter"
              type="date"
              className="w-40"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
        <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>
                Add a new customer appointment
              </DialogDescription>
            </DialogHeader>
            {/* <form action={handleCreateBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Customer Name</Label>
                  <Input id="customer" name="customer" required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" type="tel" required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service">Service</Label>
                  <Select name="service" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Self-Service Bay">
                        Self-Service Bay
                      </SelectItem>
                      <SelectItem value="$15 Handwash">$15 Handwash</SelectItem>
                      <SelectItem value="Professional Detailing">
                        Professional Detailing
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" name="price" placeholder="$0.00" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" required />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" name="time" type="time" required />
                </div>
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    name="duration"
                    placeholder="1 hour"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Additional notes..."
                />
              </div>
              <Button type="submit" className="w-full">
                Create Booking
              </Button>
            </form> */}
          </DialogContent>
        </Dialog>
      </div>

      {/* Bookings for Selected Date */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            Bookings for {new Date(selectedDate).toLocaleDateString()}
          </CardTitle>
          <CardDescription>
            {getBookingsForDate(selectedDate).length} appointments scheduled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {getBookingsForDate(selectedDate).length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bookings for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getBookingsForDate(selectedDate).map((booking) => (
                <Card key={booking.id} className="bg-muted border-border">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start sm:items-center space-x-4 min-w-0">
                        <div className="flex-shrink-0">
                          {booking.status === "completed" && (
                            <CheckCircle className="h-6 w-6 text-blue-900" />
                          )}
                          {booking.status === "pending" && (
                            <AlertCircle className="h-6 w-6 text-muted-foreground" />
                          )}
                          {booking.status === "confirmed" && (
                            <Clock className="h-6 w-6 text-green-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-card-foreground truncate">
                            {booking.customer_name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {booking.service_package_name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {booking.appointment_time} (
                              {booking.total_duration})
                            </span>
                            <span className="flex items-center truncate max-w-[180px]">
                              <Phone className="h-3 w-3 mr-1" />
                              {booking.customer_phone
                                ? booking.customer_phone
                                : "none"}
                            </span>
                            <span className="flex items-center truncate max-w-[220px]">
                              <Mail className="h-3 w-3 mr-1" />
                              {booking.customer_email}
                            </span>
                          </div>
                          {booking.notes && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              Note: {booking.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start sm:items-center flex-col sm:flex-row space-x-3 space-y-2 sm:space-y-0 shrink-0 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              booking.status === "completed"
                                ? "default"
                                : "outline"
                            }
                            className={`text-white ${
                              booking.status === "pending"
                                ? "bg-yellow-600"
                                : booking.status === "confirmed"
                                ? "bg-green-600"
                                : booking.status === "completed"
                                ? "bg-blue-900"
                                : ""
                            }`}
                          >
                            {booking.status}
                          </Badge>
                          <span className="font-semibold text-card-foreground">
                            ${booking.total_price}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          {booking.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-yellow-600"
                              onClick={() =>
                                updateBookingStatus(booking.id, "confirmed")
                              }
                            >
                              {loading ? "confirming" : "Start"}
                            </Button>
                          )}
                          {booking.status === "confirmed" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                updateBookingStatus(booking.id, "completed")
                              }
                            >
                              Mark as complete
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Bookings Overview */}
      <Card className="mt-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">All Bookings</CardTitle>
          <CardDescription>Complete list of all appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {booking.status === "completed" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {booking.status === "confirmed" && (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                    {booking.status === "pending" && (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">
                      {booking.customer_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.service_package_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-card-foreground">
                      Date: {booking.appointment_date}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Time: {booking.appointment_time}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      booking.status === "pending"
                        ? "text-yellow-600 border-yellow-600"
                        : booking.status === "confirmed"
                        ? "text-green-600 border-green-600"
                        : booking.status === "completed"
                        ? "text-blue-900 border-blue-900"
                        : "text-gray-600 border-gray-600"
                    }`}
                  >
                    {booking.status}
                  </Badge>
                  <span className="font-semibold text-card-foreground">
                    ${booking.total_price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
