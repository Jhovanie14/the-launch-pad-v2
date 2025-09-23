"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBooking } from "@/context/bookingContext";
import { AuthUser, UserProfile } from "@/types";
import SubscriptionStatus from "./subscription-status";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

interface DashboardContentProps {
  user: UserProfile;
}

export default function DashboardContent({ user }: DashboardContentProps) {
  const { openBookingModal } = useBooking();
  const [loading, setLoading] = useState(false);
  const [totalBooking, setTotalBooking] = useState<number>(0);
  const [totalBookingCompleted, setTotalBookingCompleted] = useState<number>(0);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [diffFromLastMonth, setDiffFromLastMonth] = useState<number>(0);
  const supabase = createClient();

  const fetchTotalBooking = async () => {
    setLoading(true);
    try {
      const now = new Date();

      // Current month range
      const thisMonthStart = startOfMonth(now).toISOString();
      const thisMonthEnd = endOfMonth(now).toISOString();

      // Last month range
      const lastMonth = subMonths(now, 1);
      const lastMonthStart = startOfMonth(lastMonth).toISOString();
      const lastMonthEnd = endOfMonth(lastMonth).toISOString();

      const { count: thisMonthCount, error: thisMonthError } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true }) // only count, no rows
        .eq("user_id", user.id)
        .gte("created_at", thisMonthStart)
        .lte("created_at", thisMonthEnd);

      if (thisMonthError) throw thisMonthError;

      // Get last month bookings
      const { count: lastMonthCount, error: lastMonthError } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", lastMonthStart)
        .lte("created_at", lastMonthEnd);

      if (lastMonthError) throw lastMonthError;

      setTotalBooking(thisMonthCount ?? 0);
      setDiffFromLastMonth((thisMonthCount ?? 0) - (lastMonthCount ?? 0));
    } catch (error) {
      console.error("Error fetching total bookings:", error);
      setTotalBooking(0);
    } finally {
      setLoading(false);
    }
  };
  const fetchTotalBookingCompleted = async () => {
    setLoading(true);
    try {
      const { count, error } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");

      if (error) throw error;
      setTotalBookingCompleted(count ?? 0);
    } catch (error) {
      console.error("Error fetching total bookings:", error);
      setTotalBookingCompleted(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("id,status,created_at") // or specific fields you need
        .eq("user_id", user.id) // 👈 if you only want current user's bookings
        .order("created_at", { ascending: false }) // newest first
        .limit(3); // only latest 5 bookings

      if (error) throw error;

      setRecentBookings(data || []);
    } catch (error) {
      console.error("Error fetching recent bookings:", error);
      setRecentBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-800";
      case "completed":
        return "bg-green-800";
      case "pending":
        return "bg-orange-800";
      default:
        return "bg-gray-800";
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchRecentBookings();
    fetchTotalBooking();
    fetchTotalBookingCompleted();
  }, [user?.id]);

  return (
    <main className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.full_name || user?.email}!
              </p>
            </div>
            <Button
              onClick={openBookingModal}
              className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 rounded-md transition-all duration-200 shadow-md hover:shadow-lg uppercase tracking-wide"
            >
              Book Online
            </Button>
          </div>
          <SubscriptionStatus />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Bookings
                </CardTitle>
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBooking}</div>
                <p className="text-xs text-muted-foreground">
                  {diffFromLastMonth >= 0 ? "+" : "-"}
                  {diffFromLastMonth} from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Tasks
                </CardTitle>
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
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  +1 from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
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
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalBookingCompleted}
                </div>
                <p className="text-xs text-muted-foreground">
                  +4 from last week
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>
                  Your latest actions and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`h-2 w-2 rounded-full ${getStatusColor(
                          booking.status
                        )}`}
                      />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{booking.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(booking.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {/* <div className="flex items-center space-x-4">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">Booking confirmed</p>
                      <p className="text-xs text-muted-foreground">
                        4 hours ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="h-2 w-2 rounded-full bg-yellow-600" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">Booking pending</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div> */}
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <button
                    onClick={openBookingModal}
                    className="w-full rounded-md bg-gray-100 px-4 py-2 text-left text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    Book Online
                  </button>
                  <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-left text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
                    View all tasks
                  </button>
                  <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-left text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
                    Update profile
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
