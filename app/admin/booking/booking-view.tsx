"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import NewBookingModal from "@/components/admin/newbooking-modal";
import { BookingNotification } from "@/components/booking-notification";
import EditBookingModal from "@/components/edit-booking-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context";
import { useBookingRealtime, type BookingRealtimeChange } from "@/hooks/useBookingRealtime";
import { usePushNotifications } from "@/hooks/usePushNotification";
import { bookingSearchOr, houstonToday, vehicleSearchOr } from "@/lib/admin/bookingQuery";
import {
  CALENDAR_SELECT,
  applyBookingChange,
  compareSlots,
  dayCounts,
  dayLabel,
  isShortRefTerm,
  matchesShortRef,
  monthBounds,
  monthOf,
  nextWaitingId,
  queueStatus,
  sortSearchResults,
  type CalendarEntry,
  type QueueStatus,
} from "@/lib/admin/bookingQueue";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { BookingCard } from "./booking-card";
import { BookingDrawer } from "./booking-drawer";
import { BOOKING_SELECT, withAddOns } from "./booking-select";
import { BookingsListTab } from "./bookings-list-tab";
import { QueueCalendar } from "./queue-calendar";

type Chip = "all" | Exclude<QueueStatus, "cancelled">;

const CHIPS: { value: Chip; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const SEARCH_LIMIT = 50;

function toEntry(b: Booking): CalendarEntry {
  return {
    id: b.id,
    appointment_date: b.appointment_date,
    appointment_time: b.appointment_time,
    status: b.status,
    customer_name: b.customer_name,
  };
}

export default function BookingsView() {
  const supabase = createClient();
  const { userProfile } = useAuth();

  // Clock: "today" (Houston) and the "New" tag both follow it.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const today = houstonToday(now);

  const [tab, setTab] = useState<"calendar" | "list">("calendar");
  const [selected, setSelected] = useState(() => houstonToday());
  const [month, setMonth] = useState(() => monthOf(houstonToday()));
  const [showCancelled, setShowCancelled] = useState(false);
  const [chip, setChip] = useState<Chip>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [dayLoading, setDayLoading] = useState(true);
  const [monthEntries, setMonthEntries] = useState<CalendarEntry[]>([]);
  const [results, setResults] = useState<Booking[] | null>(null);
  const [resultsTruncated, setResultsTruncated] = useState(false);
  const [searching, setSearching] = useState(false);
  const [memberIds, setMemberIds] = useState<Set<string>>(() => new Set());

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listRefresh, setListRefresh] = useState(0);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBookingNotification, setNewBookingNotification] = useState<Booking | null>(null);

  // Latest values for the realtime handler and search, without re-subscribing.
  const selectedRef = useRef(selected);
  const monthRef = useRef(month);
  const todayRef = useRef(today);
  const dayRef = useRef(dayBookings);
  const monthEntriesRef = useRef(monthEntries);
  useEffect(() => {
    selectedRef.current = selected;
    monthRef.current = month;
    todayRef.current = today;
    dayRef.current = dayBookings;
    monthEntriesRef.current = monthEntries;
  }, [selected, month, today, dayBookings, monthEntries]);

  // Typing pauses for 300ms before a search query runs.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ---- Data -------------------------------------------------------------

  // The day panel: the selected date's bookings, with vehicle and add-ons.
  const loadDay = useCallback(async (): Promise<Booking[] | null> => {
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("appointment_date", selected)
      .order("appointment_time", { ascending: true });
    if (error) {
      console.error("Error fetching bookings for date:", error);
      toast.error("Couldn't load this day's bookings");
      return null;
    }
    return withAddOns(data).sort(compareSlots);
  }, [supabase, selected]);

  // The calendar: a light row per booking across the visible grid.
  const loadMonth = useCallback(async (): Promise<CalendarEntry[] | null> => {
    const { gte, lte } = monthBounds(month);
    const { data, error } = await supabase
      .from("bookings")
      .select(CALENDAR_SELECT)
      .gte("appointment_date", gte)
      .lte("appointment_date", lte);
    if (error) {
      console.error("Error fetching month bookings:", error);
      toast.error("Couldn't load the calendar");
      return null;
    }
    return ((data ?? []) as CalendarEntry[]).sort(compareSlots);
  }, [supabase, month]);

  // Search results: every matching booking at any date.
  const runSearch = useCallback(
    async (term: string): Promise<{ rows: Booking[]; truncated: boolean } | null> => {
      let vehicleIds: string[] = [];
      const vehicleOr = vehicleSearchOr(term);
      if (vehicleOr) {
        const { data } = await supabase.from("vehicles").select("id").or(vehicleOr).limit(100);
        vehicleIds = (data ?? []).map((v: { id: string }) => v.id);
      }
      // Short "Ref" codes match among bookings already loaded (no DB prefix search on uuid).
      const refIds = isShortRefTerm(term)
        ? [
            ...new Set(
              [...dayRef.current, ...monthEntriesRef.current]
                .filter((b) => matchesShortRef(b.id, term))
                .map((b) => b.id),
            ),
          ]
        : [];
      const or = bookingSearchOr(term, vehicleIds, refIds);
      if (!or) return { rows: [], truncated: false };
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .or(or)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
        .limit(SEARCH_LIMIT + 1);
      if (error) {
        console.error("Error searching bookings:", error);
        toast.error("Search failed");
        return null;
      }
      const rows = withAddOns(data);
      return {
        rows: sortSearchResults(rows.slice(0, SEARCH_LIMIT), todayRef.current),
        truncated: rows.length > SEARCH_LIMIT,
      };
    },
    [supabase],
  );

  useEffect(() => {
    let live = true;
    setDayLoading(true);
    loadDay().then((rows) => {
      if (!live) return;
      if (rows) setDayBookings(rows);
      setDayLoading(false);
    });
    return () => {
      live = false;
    };
  }, [loadDay]);

  useEffect(() => {
    let live = true;
    loadMonth().then((rows) => {
      if (live && rows) setMonthEntries(rows);
    });
    return () => {
      live = false;
    };
  }, [loadMonth]);

  useEffect(() => {
    if (!debouncedSearch) {
      setResults(null);
      setResultsTruncated(false);
      return;
    }
    let live = true;
    setSearching(true);
    runSearch(debouncedSearch).then((found) => {
      if (!live) return;
      setSearching(false);
      if (!found) return;
      setResults(found.rows);
      setResultsTruncated(found.truncated);
    });
    return () => {
      live = false;
    };
  }, [debouncedSearch, runSearch]);

  // Member tags: customers with an active subscription, for the cards on screen.
  const userIdsKey = useMemo(() => {
    const ids = new Set<string>();
    for (const b of [...dayBookings, ...(results ?? [])]) if (b.user_id) ids.add(b.user_id);
    return [...ids].sort().join(",");
  }, [dayBookings, results]);

  useEffect(() => {
    if (!userIdsKey) {
      setMemberIds(new Set());
      return;
    }
    let live = true;
    supabase
      .from("user_subscription")
      .select("user_id")
      .eq("status", "active")
      .in("user_id", userIdsKey.split(","))
      .then(({ data }) => {
        if (live) setMemberIds(new Set((data ?? []).map((s: { user_id: string }) => s.user_id)));
      });
    return () => {
      live = false;
    };
  }, [supabase, userIdsKey]);

  const reloadAll = useCallback(() => {
    loadDay().then((rows) => rows && setDayBookings(rows));
    loadMonth().then((rows) => rows && setMonthEntries(rows));
    if (debouncedSearch) {
      runSearch(debouncedSearch).then((found) => {
        if (!found) return;
        setResults(found.rows);
        setResultsTruncated(found.truncated);
      });
    }
    setListRefresh((n) => n + 1);
  }, [loadDay, loadMonth, runSearch, debouncedSearch]);

  // ---- Realtime -------------------------------------------------------

  const onRealtimeChange = useCallback((c: BookingRealtimeChange) => {
    const row = c.booking;
    setDayBookings((prev) =>
      applyBookingChange(prev, c.id, row, (r) => r.appointment_date === selectedRef.current),
    );
    setMonthEntries((prev) => {
      const { gte, lte } = monthBounds(monthRef.current);
      return applyBookingChange(
        prev,
        c.id,
        row ? toEntry(row) : null,
        (r) => r.appointment_date >= gte && r.appointment_date <= lte,
      );
    });
    setResults((prev) => {
      if (prev === null || !prev.some((r) => r.id === c.id)) return prev;
      return sortSearchResults(
        applyBookingChange(prev, c.id, row, () => true),
        todayRef.current,
      );
    });
    setListRefresh((n) => n + 1);

    if (c.table === "bookings" && c.type === "INSERT" && row) {
      setNewBookingNotification(row);
      setTimeout(() => setNewBookingNotification(null), 120_000);
    }
  }, []);

  useBookingRealtime(null, undefined, onRealtimeChange);

  const { isSupported, requestPermission, isGranted } = usePushNotifications();
  useEffect(() => {
    if (isSupported && !isGranted) {
      requestPermission();
    }
  }, [isSupported, isGranted, requestPermission]);

  // ---- Actions --------------------------------------------------------

  const patchLocal = useCallback((bookingId: string, updates: Partial<Booking>) => {
    const patch = (b: Booking) => (b.id === bookingId ? { ...b, ...updates } : b);
    setDayBookings((prev) => prev.map(patch));
    setResults((prev) => (prev ? prev.map(patch) : prev));
    if (updates.status) {
      const status = updates.status;
      setMonthEntries((prev) => prev.map((e) => (e.id === bookingId ? { ...e, status } : e)));
    }
  }, []);

  const removeLocal = useCallback((bookingId: string) => {
    setDayBookings((prev) => applyBookingChange(prev, bookingId, null, () => false));
    setMonthEntries((prev) => applyBookingChange(prev, bookingId, null, () => false));
    setResults((prev) => (prev ? prev.filter((b) => b.id !== bookingId) : prev));
  }, []);

  const deleteBooking = async (bookingId: string) => {
    try {
      setBusyId(bookingId);

      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) {
        console.error(error);
        toast.error("Failed to delete booking");
        return;
      }

      removeLocal(bookingId);
      setDrawerId((id) => (id === bookingId ? null : id));
      toast.success("Booking deleted");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  // Update booking status
  const updateBookingStatus = async (
    bookingId: string,
    newStatus: Booking["status"]
  ) => {
    try {
      setBusyId(bookingId);

      const attendantName = userProfile?.full_name ?? "Unknown";
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
        toast.error("Couldn't update the booking");
        return;
      }

      patchLocal(bookingId, updates as Partial<Booking>);
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error("Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  // ---- View -----------------------------------------------------------

  const selectDay = (date: string) => {
    setSelected(date);
    setMonth(monthOf(date));
    setSearch("");
    setDebouncedSearch("");
  };

  const counts = dayCounts(dayBookings);
  const nextId = selected === today ? nextWaitingId(dayBookings) : null;
  const isMember = (b: Booking) => !!b.user_id && memberIds.has(b.user_id);
  const passesFilters = (b: Booking) => {
    const s = queueStatus(b.status);
    if (s === "cancelled") return showCancelled && chip === "all";
    return chip === "all" || chip === s;
  };

  const isSearching = debouncedSearch.length > 0 && results !== null;
  const panelSource = isSearching ? results : dayBookings;
  const panelRows = panelSource.filter(passesFilters);
  const hiddenCount = panelSource.length - panelRows.length;
  const calendarEntries = showCancelled ? monthEntries : monthEntries.filter((e) => e.status !== "cancelled");

  const drawerBooking =
    (drawerId && (results?.find((b) => b.id === drawerId) ?? dayBookings.find((b) => b.id === drawerId))) || null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <BookingNotification
        booking={newBookingNotification}
        onClose={() => setNewBookingNotification(null)}
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "calendar" | "list")}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
            <p className="text-sm text-muted-foreground tabular-nums">
              {counts.waiting} waiting · {counts.inProgress} in progress · {counts.done} done
              {selected === today ? " today" : ` on ${dayLabel(selected)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TabsList className="h-11">
              <TabsTrigger value="calendar" className="px-4">Calendar</TabsTrigger>
              <TabsTrigger value="list" className="px-4">List</TabsTrigger>
            </TabsList>
            <div className="flex h-11 items-center gap-2 rounded-md border px-3">
              <Switch id="show-cancelled" checked={showCancelled} onCheckedChange={setShowCancelled} />
              <Label htmlFor="show-cancelled" className="cursor-pointer text-sm font-normal">
                Show cancelled
              </Label>
            </div>
            <Button className="h-11 bg-blue-900 text-white hover:bg-blue-800" onClick={() => setShowNewBooking(true)}>
              <Plus className="size-4" aria-hidden /> New booking
            </Button>
            {!isGranted && isSupported && (
              <Button variant="outline" className="h-11" onClick={requestPermission}>
                Enable notifications
              </Button>
            )}
            {isGranted && (
              <Button variant="outline" className="h-11" onClick={requestPermission}>
                Disable notifications
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="calendar" className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Search + status chips */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                aria-label="Search bookings"
                placeholder="Search name, phone, plate, booking #"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pr-11 pl-9"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                  }}
                  className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter by status">
              {CHIPS.map((c) => (
                <Button
                  key={c.value}
                  variant="outline"
                  aria-pressed={chip === c.value}
                  onClick={() => setChip(c.value)}
                  className={cn(
                    "h-11 shrink-0",
                    chip === c.value && "border-blue-900 bg-blue-900 text-white hover:bg-blue-800 hover:text-white",
                  )}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Calendar + day panel */}
          <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:grid-rows-[minmax(0,1fr)]">
            <div className="lg:min-h-0 lg:overflow-y-auto">
              <QueueCalendar
                month={month}
                today={today}
                selected={selected}
                entries={calendarEntries}
                onSelect={selectDay}
                onMonthChange={setMonth}
              />
            </div>

            <section
              aria-label={isSearching ? "Search results" : "Day bookings"}
              className="order-first flex flex-col rounded-lg border bg-slate-50/60 lg:order-none lg:min-h-0"
            >
              <div className="flex items-baseline justify-between gap-2 border-b px-3 py-2.5">
                <h2 className="font-semibold">
                  {isSearching ? "Search results" : selected === today ? `Today · ${dayLabel(selected)}` : dayLabel(selected)}
                </h2>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
                  {(searching || (dayLoading && !isSearching)) && (
                    <Loader2 className="size-3.5 animate-spin" aria-label="Loading" />
                  )}
                  {panelRows.length} {panelRows.length === 1 ? "booking" : "bookings"}
                </span>
              </div>

              <div className="flex flex-col gap-2 p-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                {panelRows.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isMember={isMember(b)}
                    isNext={!isSearching && b.id === nextId}
                    now={now}
                    showDate={isSearching}
                    busy={busyId === b.id}
                    onAdvance={(booking, next) => updateBookingStatus(booking.id, next)}
                    onOpen={(booking) => setDrawerId(booking.id)}
                  />
                ))}

                {panelRows.length === 0 && !(dayLoading && !isSearching) && !searching && (
                  <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                    {isSearching ? `No bookings match "${debouncedSearch}".` : "No bookings on this day."}
                  </p>
                )}
                {hiddenCount > 0 && (
                  <p className="px-2 py-1 text-center text-xs text-muted-foreground">
                    {hiddenCount} hidden by the status filter or "Show cancelled".
                  </p>
                )}
                {isSearching && resultsTruncated && (
                  <p className="px-2 py-1 text-center text-xs text-muted-foreground">
                    Showing the first {SEARCH_LIMIT}, refine your search.
                  </p>
                )}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="list" className="min-h-0">
          <BookingsListTab
            userProfile={userProfile}
            refreshKey={listRefresh}
            onUpdateStatus={updateBookingStatus}
            onDeleteBooking={deleteBooking}
          />
        </TabsContent>
      </Tabs>

      <BookingDrawer
        booking={drawerBooking}
        isMember={drawerBooking ? isMember(drawerBooking) : false}
        canDelete={userProfile?.user_type === "super_admin"}
        busy={drawerBooking ? busyId === drawerBooking.id : false}
        onOpenChange={(open) => !open && setDrawerId(null)}
        onEdit={(b) => {
          setDrawerId(null);
          setEditing(b);
        }}
        onCancelBooking={(b) => updateBookingStatus(b.id, "cancelled")}
        onDelete={(b) => deleteBooking(b.id)}
      />

      <NewBookingModal open={showNewBooking} onOpenChange={setShowNewBooking} />
      <EditBookingModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        booking={editing}
        onSuccess={reloadAll}
      />
    </div>
  );
}
