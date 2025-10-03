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
import { useAuth } from "@/context/auth-context";
import { redirect, useRouter } from "next/navigation";
import { useBookingStats } from "@/hooks/useBooking";

export default function DashboardPage() {
  const { user, userProfile, isLoading } = useAuth();
  const { openBookingModal } = useBooking();
  const { stats, recentBookings, loading } = useBookingStats();

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

  // if (isLoading || loading) {
  //   return (
  //     <div className="min-h-screen bg-gray-50">
  //       <div className="bg-white shadow-sm border-b">
  //         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  //           <div className="flex items-center justify-between h-16">
  //             <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
  //             <div className="animate-pulse bg-gray-200 h-6 w-48 rounded"></div>
  //           </div>
  //         </div>
  //       </div>
  //       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  //         <div className="space-y-6">
  //           <div className="animate-pulse bg-white rounded-lg p-6 h-48"></div>
  //           <div className="animate-pulse bg-white rounded-lg p-6 h-64"></div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {userProfile?.full_name || user?.email}!
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
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
              <p className="text-xs text-muted-foreground">
                {stats.difference >= 0 ? "+" : ""}
                {stats.difference} from last month
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
              <p className="text-xs text-muted-foreground">+1 from yesterday</p>
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
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">+4 from last week</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Your latest actions and updates</CardDescription>
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
    </main>
  );
}
