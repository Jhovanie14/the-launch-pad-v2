"use client";

import { usePushNotifications } from "@/hooks/usePushNotification";
import { BookingNotification } from "@/components/booking-notification";

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
  Mail,
  CreditCard,
  Banknote,
  Repeat,
  Loader2,
  Edit,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { bookingDateRange, bookingSearchOr, houstonToday, vehicleSearchOr } from "@/lib/admin/bookingQuery";
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
import NewBookingModal from "@/components/admin/newbooking-modal";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/auth-context";

// At the top of your BookingsView component, add this import:
import EditBookingModal from "@/components/edit-booking-modal";
import { toast } from "sonner";

type UserSubscription = {
  user_id: string;
  status: string;
};

type DateFilterType =
  | "all"
  | "today"
  | "week"
  | "month"
  | "lastWeek"
  | "lastMonth";
type StatusFilterType = "all" | Booking["status"];

const BOOKING_SELECT = `*,
  vehicle:vehicles ( year, make, model, body_type, colors, license_plate ),
  booking_add_ons ( add_ons ( id, name, price, duration, is_active ) )`;

function withAddOns(rows: any[] | null): Booking[] {
  return (rows ?? []).map((b) => ({
    ...b,
    add_ons: b.booking_add_ons?.map((ba: any) => ba.add_ons).filter(Boolean) || [],
  }));
}

type BookingStats = { total: number; today: number; revenue: number };

export default function BookingsView() {
  const supabase = createClient();
  const { userProfile } = useAuth();

  // State
  const [loading, setLoading] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [userSubscribe, setUserSubscribe] = useState<UserSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => houstonToday());

  // const [averageTime, setAverageTime] = useState("");

  // Add these state variables after your existing state declarations:
  const [showEditBooking, setShowEditBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newBookingNotification, setNewBookingNotification] =
    useState<Booking | null>(null);

  // Add this handler function:
  const handleEditClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowEditBooking(true);
  };

  // Typing pauses for 300ms before a search query runs.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // One page of bookings, searched, filtered and paged in the database.
  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      // Plate / make / model live on vehicles: find those first.
      let vehicleIds: string[] = [];
      const vehicleOr = vehicleSearchOr(debouncedSearch);
      if (vehicleOr) {
        const { data } = await supabase.from("vehicles").select("id").or(vehicleOr).limit(100);
        vehicleIds = (data ?? []).map((v: { id: string }) => v.id);
      }

      let query = supabase.from("bookings").select(BOOKING_SELECT, { count: "exact" });
      const searchOr = bookingSearchOr(debouncedSearch, vehicleIds);
      if (searchOr) query = query.or(searchOr);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const range = bookingDateRange(dateFilter, houstonToday());
      if (range.gte) query = query.gte("appointment_date", range.gte);
      if (range.lte) query = query.lte("appointment_date", range.lte);
      if (range.lt) query = query.lt("appointment_date", range.lt);

      const from = (page - 1) * pageSize;
      const { data, count, error } = await query
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error fetching bookings:", error);
        toast.error("Couldn't load bookings");
        return;
      }

      const rows = withAddOns(data);
      setBookings(rows);
      setTotal(count ?? 0);

      // Membership badges, only for the customers on this page.
      const userIds = [...new Set(rows.map((b) => b.user_id).filter((id): id is string => !!id))];
      if (userIds.length) {
        const { data: subs } = await supabase
          .from("user_subscription")
          .select("user_id, status")
          .in("user_id", userIds);
        setUserSubscribe(subs ?? []);
      } else {
        setUserSubscribe([]);
      }
    } finally {
      setLoading(false);
      setFirstLoadDone(true);
    }
  }, [supabase, debouncedSearch, statusFilter, dateFilter, page, pageSize]);

  // Totals for the cards, counted and summed in the database.
  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_booking_stats", { p_today: houstonToday() });
    if (error || !data) {
      console.error("Error fetching booking stats:", error);
      setStats(null);
      return;
    }
    const raw = data as { total: number | string; today: number | string; revenue: number | string };
    setStats({ total: Number(raw.total), today: Number(raw.today), revenue: Number(raw.revenue) });
  }, [supabase]);

  // The day panel: only the chosen date's bookings.
  const loadDay = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("appointment_date", selectedDate)
      .order("appointment_time", { ascending: false });
    if (error) {
      console.error("Error fetching bookings for date:", error);
      return;
    }
    setDayBookings(withAddOns(data));
  }, [supabase, selectedDate]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);
  useEffect(() => {
    loadStats();
  }, [loadStats]);
  useEffect(() => {
    loadDay();
  }, [loadDay]);

  const handleEditSuccess = () => {
    loadPage();
    loadStats();
    loadDay();
  };

  // Realtime and local edits update both the page and the day panel.
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);
  const setBothLists = useCallback((action: React.SetStateAction<Booking[]>) => {
    setBookings(action);
    setDayBookings((prev) =>
      (typeof action === "function" ? action(prev) : action).filter(
        (b) => b.appointment_date === selectedDateRef.current,
      ),
    );
  }, []);

  const { isSupported, requestPermission, showNotification, isGranted } =
    usePushNotifications();

  // Request permission on mount (optional - you can also add a button)
  useEffect(() => {
    if (isSupported && !isGranted) {
      // Optionally auto-request, or show a button to request
      // requestPermission();
    }
  }, [isSupported, isGranted]);

  const handleNewBooking = useCallback((booking: Booking) => {
    // const customerName = booking.customer_name || "Guest";
    // const serviceName = booking.service_package_name || "Service";
    // const appointmentTime = booking.appointment_time || "";

    // Show custom notification instead of browser notification
    setNewBookingNotification(booking);
    loadStats();

    // Also show toast notification
    // toast.success(`New booking from ${customerName}`, {
    //   description: `${serviceName} - ${appointmentTime}`,
    //   duration: 5000,
    // });

    // Auto-dismiss after 10 seconds (optional)
    setTimeout(() => {
      setNewBookingNotification(null);
    }, 120000);
  }, [loadStats]);
  useBookingRealtime(setBothLists, handleNewBooking);
  // const handleNewBooking = useCallback(
  //   (booking: Booking) => {
  //     const customerName = booking.customer_name || "Guest";
  //     const serviceName = booking.service_package_name || "Service";
  //     const appointmentTime = booking.appointment_time || "";

  //     showNotification("New Booking Received", {
  //       body: `${customerName} - ${serviceName} at ${appointmentTime}`,
  //       tag: `booking-${booking.id}`,
  //       requireInteraction: true, // Add this - keeps notification visible
  //       vibrate: [200, 100, 200], // Add vibration pattern
  //       data: {
  //         url: `/admin/booking`,
  //         bookingId: booking.id,
  //       },
  //     } as NotificationOptions & { vibrate?: number[] }); // Type assertion to include vibrate

  //     // Also show toast notification
  //     toast.success(`New booking from ${customerName}`, {
  //       description: `${serviceName} - ${appointmentTime}`,
  //       duration: 30000, // Make toast stay longer too (5 seconds)
  //     });
  //   },
  //   [showNotification]
  // );

  // Realtime updates

  useEffect(() => {
    if (isSupported && !isGranted) {
      requestPermission(); // Uncomment this line
    }
  }, [isSupported, isGranted, requestPermission]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, dateFilter]);

  const deleteBooking = async (bookingId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) {
        console.error(error);
        toast.error("Failed to delete booking");
        return;
      }

      setBothLists((prev) => prev.filter((b) => b.id !== bookingId));
      setTotal((t) => Math.max(0, t - 1));
      loadStats();
      toast.success("Booking deleted");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Update booking status
  const updateBookingStatus = async (
    bookingId: string,
    newStatus: Booking["status"]
  ) => {
    try {
      setLoading(true);

      const attendantName = userProfile?.full_name ?? "Unknown";
      console.log("Attendant name:", attendantName);
      const updates: Record<string, any> = {
        status: newStatus,
        attendant_name: attendantName,
      };

      if (newStatus === "confirmed") {
        updates.confirmed_at = new Date().toISOString();
        updates.attendant_name = attendantName;
      }

      if (newStatus === "completed") {
        updates.completed_at = new Date().toISOString();
        updates.attendant_name = attendantName;

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
            body: JSON.stringify({ bookingId: booking.id }),
          });
          await fetch("/api/send-invoice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: booking.id }),
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

      setBothLists((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, ...updates } : b))
      );
      loadStats();
    } catch (error) {
      console.error("Error updating booking status:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBookingCompletionTime = (booking: Booking) => {
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

    if (diffSec < 60) {
      return `${diffSec.toFixed(0)} sec`;
    }

    const diffMin = diffSec / 60;
    if (diffMin < 60) {
      return `${diffMin.toFixed(0)} min`;
    }

    const diffHr = diffMin / 60;
    return `${diffHr.toFixed(0)} hr`;
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

  const isNewBooking = (appointmentDate: string, appointmentTime: string) => {
    if (!appointmentDate || !appointmentTime) return false;

    // Normalize "10:10 PM" → "22:10"
    let normalizedTime = appointmentTime.trim();
    if (/am|pm/i.test(normalizedTime)) {
      const [time, period] = normalizedTime.split(/ ?(am|pm)/i);
      let [hours, minutes] = time.split(":").map(Number);
      if (/pm/i.test(period) && hours < 12) hours += 12;
      if (/am/i.test(period) && hours === 12) hours = 0;
      normalizedTime = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    }

    // Safely parse using toLocaleString (handles both MM/DD/YYYY and YYYY-MM-DD)
    const appointment = new Date(
      new Date(`${appointmentDate} ${normalizedTime}`).toLocaleString("en-US")
    );

    if (isNaN(appointment.getTime())) {
      console.warn(
        "⚠️ Invalid booking date/time:",
        appointmentDate,
        appointmentTime
      );
      return false;
    }

    const now = new Date();
    const diffMs = now.getTime() - appointment.getTime();
    const tenMinutes = 10 * 60 * 1000;

    // Debug (optional)
    // console.log("Now:", now.toLocaleString());
    // console.log("Appointment:", appointment.toLocaleString());
    // console.log("Diff (minutes):", diffMs / 60000);

    return diffMs >= 0 && diffMs <= tenMinutes;
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

  const getProgress = (status: string) => {
    switch (status) {
      case "pending":
        return { value: 33.3, label: "Pending" };
      case "confirmed":
        return { value: 66.6, label: "In Progress" };
      case "completed":
        return { value: 100, label: "Completed" };
      case "cancelled":
        return { value: 0, label: "Cancelled" };
      default:
        return { value: 0, label: "Unknown" };
    }
  };

  // Loading state
  if (!firstLoadDone) {
    return (
      <div className="w-full flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <BookingNotification
        booking={newBookingNotification}
        onClose={() => setNewBookingNotification(null)}
      />
      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold">{stats ? stats.total.toLocaleString() : "—"}</p>
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
                <p className="text-2xl font-bold">{stats ? stats.today.toLocaleString() : "—"}</p>
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
                  {stats ? `${stats.revenue.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—"}
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
        {!isGranted && isSupported && (
          <Button
            onClick={requestPermission}
            variant="outline"
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            Enable Notifications
          </Button>
        )}
        {isGranted && (
          <Button
            onClick={requestPermission}
            variant="outline"
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            Disable Notifications
          </Button>
        )}
      </div>
      <Card className="bg-card border-border mb-10">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            Bookings for {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US")}
          </CardTitle>
          <CardDescription>
            {dayBookings.length} appointments scheduled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dayBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bookings for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dayBookings.map((booking) => (
                <Card
                  key={booking.id}
                  className={`border-border transition-all duration-300 ${
                    isNewBooking(
                      booking.appointment_date,
                      booking.appointment_time
                    )
                      ? "border-yellow-300 shadow-md animate-pulse"
                      : "bg-muted"
                  }`}
                >
                  <CardContent className="px-4">
                    <div className="shrink-0 mb-1">
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
                    <div className="flex flex-col sm:flex-row items-baseline sm:items-center justify-between">
                      <p className="text-lg text-accent-foreground">
                        Attendant:{" "}
                        <span className="font-medium text-sm">
                          {booking.attendant_name
                            ? booking.attendant_name.toUpperCase()
                            : "None"}
                        </span>
                      </p>

                      {booking.status === "completed" && (
                        <div className="flex flex-col sm:flex-row items-center space-x-2">
                          <p className="text-sm font-medium text-accent-foreground">
                            Completion Time
                          </p>
                          <p className="text-2xl font-bold">
                            {getBookingCompletionTime(booking)}
                          </p>
                          <Clock className="h-6 w-6 text-accent-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* LEFT SIDE: Booking info */}
                      <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex flex-col sm:flex-row items-baseline sm:items-center space-y-2 sm:space-y-0 space-x-3">
                            <h3 className="font-semibold text-card-foreground text-base sm:text-lg">
                              Customer Name:
                            </h3>
                            <p className="text-xs sm:text-sm font-light text-accent-foreground">
                              {booking.customer_name}
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-baseline sm:items-center space-y-2 sm:space-y-0 space-x-3">
                            <h3 className="font-semibold text-card-foreground text-base sm:text-lg">
                              Service Package:
                            </h3>
                            <p className="text-xs sm:text-sm font-light text-accent-foreground">
                              {booking.service_package_name}
                            </p>
                            <h3 className="font-semibold text-card-foreground text-base sm:text-lg">
                              Inclusions:
                            </h3>
                            {booking.add_ons?.length > 0 ? (
                              <ul>
                                {booking.add_ons.map((addon) => (
                                  <li key={addon.id}>
                                    <p className="text-xs sm:text-sm font-light text-accent-foreground">
                                      {addon.name}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-xs sm:text-sm font-light text-accent-foreground">
                                No add-ons
                              </span>
                            )}
                          </div>
                          <p className="flex items-center text-sm sm:text-lg font-medium text-accent-foreground gap-2">
                            <Car className="w-5 h-5" />
                            {booking.vehicle?.body_type} {" - "}
                            {booking.vehicle?.year} {booking.vehicle?.make}{" "}
                            {booking.vehicle?.model} {" - "}
                            {booking.vehicle?.colors}
                            {booking.vehicle?.license_plate}
                          </p>
                          <p className="text-sm text-accent-foreground">
                            <strong> Booking # </strong>
                            {booking.id}
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
                        {isNewBooking(
                          booking.appointment_date,
                          booking.appointment_time
                        ) && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-300 text-yellow-900">
                            🆕 New Booking
                          </span>
                        )}
                        <div className="flex items-center justify-between sm:justify-start space-x-2">
                          <Badge
                            className={`${getStatusColor(booking.status)} capitalize`}
                          >
                            {booking.status}
                          </Badge>

                          <span className="font-semibold text-card-foreground text-lg sm:text-xl">
                            ${booking.total_price}
                          </span>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="flex flex-wrap gap-2 sm:gap-1">
                          {booking.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClick(booking)}
                                className="bg-gray-100 hover:bg-gray-200"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>

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
                            </>
                          )}
                          {booking.status === "confirmed" && (
                            <Button
                              size="sm"
                              disabled={loading}
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
                    {/* Progress bar */}
                    <div className="mt-3 w-full">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {getProgress(booking.status).label}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {getProgress(booking.status).value}%
                        </span>
                      </div>
                      <Progress
                        value={getProgress(booking.status).value}
                        className={`h-2 rounded-full ${
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
                <SelectItem value="lastWeek">Last 7 Days</SelectItem>
                <SelectItem value="lastMonth">Last 30 Days</SelectItem>
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
            bookings={bookings}
            onUpdateStatus={updateBookingStatus}
            onDeleteBooking={deleteBooking}
            user_subscription={userSubscribe}
            userProfile={userProfile}
          />

          {/* Pagination */}
          <Pagination
            page={page}
            total={total}
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
      <EditBookingModal
        open={showEditBooking}
        onOpenChange={setShowEditBooking}
        booking={selectedBooking}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
