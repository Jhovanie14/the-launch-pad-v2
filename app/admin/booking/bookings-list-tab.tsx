"use client";

import { useCallback, useEffect, useState } from "react";
import { FileDown, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { ExportModal } from "@/components/export-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingsTable } from "@/components/user/bookings-table";
import { bookingDateRange, bookingSearchOr, houstonToday, vehicleSearchOr } from "@/lib/admin/bookingQuery";
import type { Booking, UserProfile } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { BOOKING_SELECT, withAddOns } from "./booking-select";

type UserSubscription = { user_id: string; status: string };
type DateFilterType = "all" | "today" | "week" | "month" | "lastWeek" | "lastMonth";
type StatusFilterType = "all" | Booking["status"];

type Props = {
  userProfile: UserProfile | null;
  /** Bumped by the page when bookings change; reloads the current page. */
  refreshKey: number;
  onUpdateStatus: (id: string, status: Booking["status"]) => Promise<void>;
  onDeleteBooking: (id: string) => Promise<void>;
};

const PAGE_SIZE = 10;

/** The office view: every booking, searched, filtered, paged and exportable. */
export function BookingsListTab({ userProfile, refreshKey, onUpdateStatus, onDeleteBooking }: Props) {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [userSubscribe, setUserSubscribe] = useState<UserSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Typing pauses for 300ms before a search query runs.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, dateFilter]);

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

      const from = (page - 1) * PAGE_SIZE;
      const { data, count, error } = await query
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

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
    }
  }, [supabase, debouncedSearch, statusFilter, dateFilter, page]);

  useEffect(() => {
    loadPage();
  }, [loadPage, refreshKey]);

  const updateStatus = async (id: string, status: Booking["status"]) => {
    await onUpdateStatus(id, status);
    await loadPage();
  };

  const deleteBooking = async (id: string) => {
    await onDeleteBooking(id);
    await loadPage();
  };

  // Export handler
  const handleDownload = async (type: "pdf" | "excel", statusFilter: string, dateFilter: string) => {
    try {
      const queryParams = new URLSearchParams();
      if (dateFilter !== "all") queryParams.append("date", dateFilter);
      if (statusFilter !== "all") queryParams.append("status", statusFilter);

      const res = await fetch(`/api/bookings/export?type=${type}&${queryParams.toString()}`);

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

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Booking Management
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
        </CardTitle>
        <CardDescription>View and manage all customer bookings</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search all bookings"
                placeholder="Search name, phone, plate, booking #"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilterType)}>
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

          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilterType)}>
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

          <Button onClick={() => setExportModalOpen(true)} variant="outline" className="w-24">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Table */}
        <BookingsTable
          bookings={bookings}
          onUpdateStatus={updateStatus}
          onDeleteBooking={deleteBooking}
          user_subscription={userSubscribe}
          userProfile={userProfile}
        />

        {/* Pagination */}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </CardContent>

      {/* Export Modal */}
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} onExport={handleDownload} />
    </Card>
  );
}
