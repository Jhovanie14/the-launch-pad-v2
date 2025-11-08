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
import {
  Calendar,
  Car,
  DollarSign,
  Search,
  FileDown,
  CheckCircle,
  Clock,
  AlertCircle,
  Phone,
  Edit,
  Trash2,
  Mail,
  CreditCard,
  Banknote,
  Repeat,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { Button } from "@/components/ui/button";
import { ExportModal } from "@/components/export-modal";
import { useBooking } from "@/context/bookingContext";
import NewBookingModal from "@/components/admin/newbooking-modal";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type UserSubscription = {
  user_id: string;
  status: string;
};

type DateFilterType = "all" | "today" | "week" | "month";
type StatusFilterType = "all" | Booking["status"];

export default function BookingsView() {
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [userSubscribe, setUserSubscribe] = useState<UserSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  );

  // Fetch all bookings
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `*,
          vehicle:vehicles ( year, make, model, body_type, colors ),
          add_ons ( name, price )`
        )
        .order("appointment_date", { ascending: true });

      setLoading(false);

      if (error) {
        console.error("Error fetching bookings:", error);
        return;
      }

      setBookings(data || []);
    };

    fetchBookings();
  }, [supabase]);

  // Fetch user subscriptions
  useEffect(() => {
    const fetchUserSubscribe = async () => {
      const { data, error } = await supabase
        .from("user_subscription")
        .select("user_id, status");

      if (error) {
        console.error("Error fetching subscriptions:", error);
        return;
      }

      setUserSubscribe(data || []);
    };

    fetchUserSubscribe();
  }, [supabase]);

  // Fetch total revenue
  useEffect(() => {
    const fetchTotalRevenue = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("total_price")
        .in("status", ["completed", "confirmed"]);

      if (error) {
        console.error("Error fetching total revenue:", error);
        return;
      }

      const revenue = data?.reduce(
        (sum, b) => sum + Number(b.total_price ?? 0),
        0
      );

      setTotalRevenue(revenue ?? 0);
    };

    fetchTotalRevenue();
  }, [supabase]);

  // Realtime updates
  useBookingRealtime(setBookings);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, dateFilter]);

  // Update booking status
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

        const { data: booking } = await supabase
          .from("bookings")
          .select("customer_name, customer_email, id")
          .eq("id", bookingId)
          .single();

        if (booking?.customer_email) {
          console.log("📨 Sending tip email to:", booking.customer_email);
          await fetch("/api/send-tip-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: booking.customer_email,
              name: booking.customer_name,
              bookingId: booking.id,
            }),
          });
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
      }

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, ...updates } : b))
      );
    } catch (error) {
      console.error("Error updating booking status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Export handler
  const handleDownload = async (
    type: "pdf" | "excel",
    statusFilter: string,
    dateFilter: string
  ) => {
    try {
      const queryParams = new URLSearchParams();
      if (dateFilter !== "all") queryParams.append("date", dateFilter);
      if (statusFilter !== "all") queryParams.append("status", statusFilter);

      const res = await fetch(
        `/api/bookings/export?type=${type}&${queryParams.toString()}`
      );

      if (!res.ok) throw new Error("Failed to generate file");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings.${type === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Date filter logic
  const matchesDateFilter = (appointmentDate: string): boolean => {
    if (dateFilter === "all") return true;

    // Parse the appointment date - handle both ISO and YYYY-MM-DD formats
    const bookingDate = new Date(appointmentDate + "T00:00:00");
    const today = new Date();

    // Normalize to start of day for comparison
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const bookingDateStart = new Date(
      bookingDate.getFullYear(),
      bookingDate.getMonth(),
      bookingDate.getDate()
    );

    switch (dateFilter) {
      case "today":
        return bookingDateStart.getTime() === todayStart.getTime();

      case "week": {
        // Show bookings within next 7 days (including today)
        const weekAhead = new Date(todayStart);
        weekAhead.setDate(todayStart.getDate() + 7);
        return bookingDateStart >= todayStart && bookingDateStart <= weekAhead;
      }

      case "month": {
        // Show bookings within next 30 days (including today)
        const monthAhead = new Date(todayStart);
        monthAhead.setDate(todayStart.getDate() + 30);
        return bookingDateStart >= todayStart && bookingDateStart <= monthAhead;
      }

      default:
        return true;
    }
  };

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    // Search filter
    const searchFields = [
      booking.service_package_name?.toLowerCase() ?? "",
      (booking as any).vehicles?.make?.toLowerCase() ?? "",
      (booking as any).vehicles?.model?.toLowerCase() ?? "",
      booking.customer_name?.toLowerCase() ?? "",
      booking.customer_email?.toLowerCase() ?? "",
      booking.id.toLowerCase() ?? "",
      booking.vehicle?.make?.toLowerCase() ?? "",
      booking.vehicle?.model?.toLowerCase() ?? "",
    ];

    const matchesSearch =
      searchTerm === "" ||
      searchFields.some((field) => field.includes(searchTerm.toLowerCase()));

    // Status filter
    const matchesStatus =
      statusFilter === "all" || booking.status === statusFilter;

    // Date filter
    const matchesDate = matchesDateFilter(booking.appointment_date);

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Paginate filtered results
  const paginatedBookings = filteredBookings.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Today's bookings
  const todayBookings = bookings.filter(
    (b) =>
      format(new Date(b.appointment_date), "yyyy-MM-dd") ===
      format(new Date(), "yyyy-MM-dd")
  );

  const getBookingsForDate = (date: string) => {
    if (!date) return [];
    return bookings.filter(
      (b) =>
        new Date(b.appointment_date).toLocaleDateString() ===
        new Date(date).toLocaleDateString()
    );
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

  // Loading state
  if (loading && bookings.length === 0) {
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
      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold">{bookings.length}</p>
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
                <p className="text-2xl font-bold">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-accent-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <Label htmlFor="date-filter">Filter by Date</Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      <Card className="bg-card border-border mb-10">
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* LEFT SIDE: Booking info */}
                      <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          {booking.status === "completed" && (
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          )}
                          {booking.status === "confirmed" && (
                            <Clock className="h-6 w-6 text-accent" />
                          )}
                          {booking.status === "pending" && (
                            <AlertCircle className="h-6 w-6 text-accent-foreground" />
                          )}
                        </div>

                        <div className="flex flex-col space-y-1">
                          <div className="flex flex-row items-center space-x-3">
                            <h3 className="font-semibold text-card-foreground text-base sm:text-lg">
                              {booking.customer_name}
                            </h3>
                            <p className="text-lg sm:text-2xl font-medium text-accent-foreground">
                              {booking.service_package_name}
                            </p>
                          </div>
                          <p className="flex items-center text-sm sm:text-lg font-medium text-accent-foreground gap-2">
                            <Car className="w-5 h-5" />
                            {booking.vehicle?.body_type} {" - "}
                            {booking.vehicle?.year} {booking.vehicle?.make}{" "}
                            {booking.vehicle?.model} {" - "}
                            {booking.vehicle?.colors}
                          </p>
                          <p className="text-sm text-accent-foreground">
                            Booking #{booking.id}
                          </p>

                          {/* Details */}
                          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:space-x-4 mt-1">
                            <span className="text-sm text-accent-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(booking.appointment_time)} (
                              {booking.total_duration} mins)
                            </span>
                            {booking.customer_phone && (
                              <span className="text-sm text-accent-foreground flex items-center mt-1 sm:mt-0">
                                <Phone className="h-3 w-3 mr-1" />
                                {booking.customer_phone}
                              </span>
                            )}
                            <span className="text-sm text-accent-foreground flex items-center mt-1 sm:mt-0">
                              <Mail className="h-3 w-3 mr-1" />
                              {booking.customer_email}
                            </span>
                          </div>
                          {booking.payment_method && (
                            <div className="flex items-center mt-2 sm:mt-0">
                              <span className="text-sm text-accent-foreground mr-2">
                                Payment Method:
                              </span>
                              {booking.payment_method === "card" && (
                                <CreditCard className="h-4 w-4 mr-1 text-blue-500" />
                              )}
                              {booking.payment_method === "cash" && (
                                <Banknote className="h-4 w-4 mr-1 text-green-500" />
                              )}
                              {booking.payment_method === "subscription" && (
                                <Repeat className="h-4 w-4 mr-1 text-purple-500" />
                              )}
                              {booking.payment_method}
                            </div>
                          )}
                          {booking.notes && (
                            <p className="text-sm text-accent-foreground mt-2 italic">
                              “{booking.notes}”
                            </p>
                          )}
                        </div>
                      </div>

                      {/* RIGHT SIDE: Status + Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                        <div className="flex items-center justify-between sm:justify-start space-x-2">
                          <Badge
                            className={`${getStatusColor(booking.status)} capitalize`}
                          >
                            {booking.status}
                          </Badge>

                          <span className="font-semibold text-card-foreground text-sm sm:text-base">
                            ${booking.total_price}
                          </span>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="flex flex-wrap gap-2 sm:gap-1">
                          {booking.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-blue-300"
                              onClick={() =>
                                updateBookingStatus(booking.id, "confirmed")
                              }
                            >
                              Start
                            </Button>
                          )}
                          {booking.status === "confirmed" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                updateBookingStatus(booking.id, "completed")
                              }
                            >
                              Complete
                            </Button>
                          )}
                          {/* <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-3 w-3" />
                          </Button> */}
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
      {/* Bookings Table */}
      <Card className="bg-card border-border">
        <CardHeader className="flex items-center justify-between">
          <div className="space-y-3">
            <CardTitle>Booking Management</CardTitle>
            <CardDescription>
              View and manage all customer bookings
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowNewBooking(true)}
            className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 rounded-md transition-all duration-200 shadow-md hover:shadow-lg uppercase tracking-wide"
          >
            + New Booking
          </Button>
          <NewBookingModal
            open={showNewBooking}
            onOpenChange={setShowNewBooking}
          />
        </CardHeader>

        <CardContent>
          {/* Filters */}
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
              onValueChange={(v) => setStatusFilter(v as StatusFilterType)}
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
              onValueChange={(v) => setDateFilter(v as DateFilterType)}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Next 7 Days</SelectItem>
                <SelectItem value="month">Next 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setExportModalOpen(true)}
              variant="outline"
              className="w-24"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Table */}
          <BookingsTable
            bookings={paginatedBookings}
            onUpdateStatus={updateBookingStatus}
            user_subscription={userSubscribe}
          />

          {/* Pagination */}
          <Pagination
            page={page}
            total={filteredBookings.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onExport={handleDownload}
      />
    </div>
  );
}
