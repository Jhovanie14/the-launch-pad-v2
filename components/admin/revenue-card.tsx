"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type RevenueData = {
  revenue: number[];
  expenses: number[];
};

type RevBooking = {
  id: string;
  created_at: string;
  status: string;
  total_price: number;
  service_package_name?: string;
  vehicle?: { year?: number; make?: string; model?: string } | null;
  booking_add_ons?: Array<{ add_ons?: { id?: string; name?: string; price?: number } | null }> | null;
  profiles?: { full_name?: string; email?: string } | null;
};

export default function RevenueCard({
  revenueData,
  addOnRevenue,
  bookingStats,
  activeSubscriptions,
}: {
  revenueData: RevenueData;
  addOnRevenue: number;
  bookingStats: { totalBookings: number; confirmedBookings: number; completedBookings: number; pendingBookings: number };
  activeSubscriptions: number;
}) {
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState<RevBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalRevenue = revenueData.revenue.reduce((a, b) => a + b, 0);
  const totalExpenses = Math.round(revenueData.expenses.reduce((a, b) => a + b, 0));

  // Fetch breakdown when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function fetchBreakdown() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/admin/revenue-breakdown");
        if (!res.ok) throw new Error("Failed to fetch revenue breakdown");
        const json = await res.json();
        if (!cancelled) setBookings(json.data || []);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) setError(err?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBreakdown();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // derive booking/add-on totals from the fetched bookings
  const fetchedBookingsRevenue = bookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const fetchedAddonRevenue = bookings.reduce(
    (s, b) =>
      s +
      (b.booking_add_ons?.reduce((s2, ba) => s2 + (ba?.add_ons?.price || 0), 0) || 0),
    0
  );

  // group by service name
  const serviceGroups: Record<string, { count: number; revenue: number }> = {};
  bookings.forEach((b) => {
    const key = b.service_package_name || "(unknown)";
    if (!serviceGroups[key]) serviceGroups[key] = { count: 0, revenue: 0 };
    serviceGroups[key].count += 1;
    serviceGroups[key].revenue += b.total_price || 0;
  });

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        <Card className="cursor-pointer hover:shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue?.toLocaleString() || "0"}</div>
            <p className="text-xs text-muted-foreground">Click to view breakdown</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revenue Breakdown</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Overview of revenue sources and recent paid bookings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Revenue (7m)</div>
                <div className="text-xl font-semibold">${totalRevenue?.toLocaleString() || "0"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Estimated Expenses</div>
                <div className="text-xl font-semibold">${totalExpenses?.toLocaleString() || "0"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-md">
                <div className="text-sm text-muted-foreground mb-2">Bookings Revenue (fetched)</div>
                <div className="text-lg font-medium">${fetchedBookingsRevenue?.toLocaleString() || "0"}</div>
                <div className="text-xs text-muted-foreground">Total bookings (fetched): {bookings.length}</div>
              </div>

              <div className="bg-muted/30 p-4 rounded-md">
                <div className="text-sm text-muted-foreground mb-2">Add-on Revenue (fetched)</div>
                <div className="text-lg font-medium">${fetchedAddonRevenue?.toLocaleString() || "0"}</div>
                <div className="text-xs text-muted-foreground">Active subscriptions: {activeSubscriptions}</div>
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Top Services</div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(serviceGroups).map(([name, info]) => (
                  <div key={name} className="p-3 bg-card rounded">
                    <div className="text-sm font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">{info.count} bookings • ${info.revenue?.toLocaleString() || "0"}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Recent Paid Bookings</div>

              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : error ? (
                <div className="text-sm text-red-500">{error}</div>
              ) : bookings.length === 0 ? (
                <div className="text-sm text-muted-foreground">No paid bookings found.</div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium">
                    <div>Date</div>
                    <div>Customer</div>
                    <div>Vehicle</div>
                    <div>Service</div>
                    <div>Add-ons</div>
                    <div className="text-right">Amount</div>
                  </div>

                  {bookings.map((b) => (
                    <div key={b.id} className="grid grid-cols-6 gap-2 items-start border-b py-2">
                      <div className="text-sm">{new Date(b.created_at).toLocaleString()}</div>
                      <div className="text-sm">{b.profiles?.full_name || b.profiles?.email || "Guest"}</div>
                      <div className="text-sm">
                        {b.vehicle ? `${b.vehicle.year ?? ""} ${b.vehicle.make ?? ""} ${b.vehicle.model ?? ""}` : "-"}
                      </div>
                      <div className="text-sm">{b.service_package_name || "-"}</div>
                      <div className="text-sm">
                        {b.booking_add_ons && b.booking_add_ons.length > 0 ? (
                          b.booking_add_ons.map((ba, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs">{ba?.add_ons?.name}</span>
                              <span className="text-xs text-muted-foreground">${ba?.add_ons?.price?.toLocaleString() || "0"}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="text-sm text-right font-medium">${(b.total_price || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
