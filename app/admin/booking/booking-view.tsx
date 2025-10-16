"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { BookingsTable } from "@/components/user/bookings-table";
import { createClient } from "@/utils/supabase/client";
import type { Booking } from "@/types";
import { format } from "date-fns";
import { Calendar, Car, DollarSign, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";

type UserSubscription = {
  user_id: string;
  status: string;
};

export default function BookingsView() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [userSubscribe, setUserSubscribe] = useState<UserSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Booking["status"]>(
    "all"
  );
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");
  // const [selectedDate, setSelectedDate] = useState(
  //   new Date().toISOString().split("T")[0]
  // );

  useEffect(() => {
    const fetchBookings = async (page: number = 1, pageSize: number = 10) => {
      setLoading(true);

      let query = supabase
        .from("bookings")
        .select(
          `*,
        vehicle:vehicles ( year, make, model, trim, body_type, colors ),
        add_ons ( name, price )`,
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      if (pageSize !== 0) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      setLoading(false);

      if (error) console.error(error);
      setBookings(data || []);
      setTotal(count || 0);
    };
    fetchBookings(page, pageSize);
  }, [supabase, page, pageSize]);

  useEffect(() => {
    // Fetch subscriptions
    const fetchUserSubscribe = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("user_subscription")
        .select("user_id, status");

      if (error) console.error(error);
      setUserSubscribe(data || []);

      console.log("all subscriber", userSubscribe);
    };

    fetchUserSubscribe();
  }, [supabase]);

  // Realtime updates for bookings table
  useBookingRealtime(setBookings);

  const getBookingsForDate = (date: string) => {
    return bookings.filter((booking) => booking.appointment_date === date);
  };

  const updateBookingStatus = async (
    bookingId: string,
    newStatus: Booking["status"]
  ) => {
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

  useEffect(() => {
    const fetchTotalRevenue = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("total_price")
        .eq("status", "completed"); // only completed bookings

      if (error) {
        console.error("Error fetching total revenue:", error);
        return;
      }

      const revenue = data?.reduce(
        (sum, b) => sum + Number(b.total_price ?? 0),
        0
      );

      setTotalRevenue(revenue ?? 0);
      console.log("total revenue", revenue);
    };

    fetchTotalRevenue();
  }, [supabase]);

  const filteredBookings = bookings.filter((booking) => {
    const serviceName = booking.service_package_name?.toLowerCase() ?? "";
    const make = (booking as any).vehicles?.make?.toLowerCase() ?? "";
    const model = (booking as any).vehicles?.model?.toLowerCase() ?? "";
    const custormerName = booking.customer_name?.toLowerCase() ?? "";
    const customerBookingId = booking?.id.toLowerCase() ?? "";

    const matchesSearch =
      serviceName.includes(searchTerm.toLowerCase()) ||
      make.includes(searchTerm.toLowerCase()) ||
      model.includes(searchTerm.toLowerCase()) ||
      custormerName.includes(searchTerm.toLowerCase()) ||
      customerBookingId.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || booking.status === statusFilter;

    const matchesDate =
      dateFilter === "all" ||
      (() => {
        const bookingDate = new Date(booking.appointment_date);
        const today = new Date();
        switch (dateFilter) {
          case "today":
            return (
              format(bookingDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
            );
          case "week": {
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return bookingDate >= weekAgo;
          }
          case "month": {
            const monthAgo = new Date(
              today.getTime() - 30 * 24 * 60 * 60 * 1000
            );
            return bookingDate >= monthAgo;
          }
          default:
            return true;
        }
      })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  const todayBookings = bookings.filter(
    (b) =>
      format(new Date(b.appointment_date), "yyyy-MM-dd") ===
      format(new Date(), "yyyy-MM-dd")
  );

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
    <div className="flex-1 overflow-y-auto p-6">
      {/* Booking Controls */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <Car className="h-8 w-8 text-accent-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Today's Bookings
                </p>
                <p className="text-2xl font-bold">{todayBookings.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-accent-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold">${totalRevenue}</p>
              </div>
              <DollarSign className="h-8 w-8 text-accent-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Bookings for Selected Date */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Booking Management</CardTitle>
          <CardDescription>
            View and manage all customer bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as Booking["status"] | "all")
              }
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={dateFilter}
              onValueChange={(v) =>
                setDateFilter(v as "all" | "today" | "week" | "month")
              }
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BookingsTable
            bookings={filteredBookings}
            onUpdateStatus={updateBookingStatus}
            user_subscription={userSubscribe}
          />
          <Pagination
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* All Bookings Overview */}
      {/* <Card className="mt-6 bg-card border-border">
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
      </Card> */}
    </div>
  );
}
