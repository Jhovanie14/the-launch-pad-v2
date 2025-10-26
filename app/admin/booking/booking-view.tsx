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
import { Calendar, Car, DollarSign, Search, FileDown } from "lucide-react";
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

type UserSubscription = {
  user_id: string;
  status: string;
};

type DateFilterType = "all" | "today" | "week" | "month";
type StatusFilterType = "all" | Booking["status"];

export default function BookingsView() {
  const supabase = createClient();
  const { openBookingModal } = useBooking();

  // State
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [userSubscribe, setUserSubscribe] = useState<UserSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [exportModalOpen, setExportModalOpen] = useState(false);

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
        .order("created_at", { ascending: false });

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
        .eq("status", "completed");

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
      }

      const { error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", bookingId);

      if (error) {
        console.error("Error updating booking:", error);
      }
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
      booking.id.toLowerCase() ?? "",
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
                  ₱{totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-accent-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

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
            onClick={openBookingModal}
            className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 rounded-md transition-all duration-200 shadow-md hover:shadow-lg uppercase tracking-wide"
          >
            Book Online
          </Button>
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
