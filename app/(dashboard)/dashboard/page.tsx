"use client";

import { useBooking } from "@/context/bookingContext";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useBookingStats } from "@/hooks/useBooking";
import RecentBookings from "@/components/recent-bookings";
import QuickActions from "@/components/qucik-actions";
import StatCard from "@/components/stats-card";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SubscriptionCancelInfo from "@/components/user/subscription-cancel-info";

export default function DashboardPage() {
  const { user, userProfile, isLoading } = useAuth();
  const { openBookingModal } = useBooking();
  const { stats, recentBookings, loading } = useBookingStats();
  const { subscription } = useSubscription();

  // console.log("User:", user);
  // console.log("Subscription:", subscription);
  // console.log("Stats:", stats);
  // console.log("Recent Bookings:", recentBookings);

  useEffect(() => {
    // console.log("Auth state changed:", { user, isLoading });
  }, [user, isLoading]);

  if (isLoading) {
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

  // if (!user) {
  //   return <div>Please log in.</div>;
  // }

  return (
    <main className="py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            {subscription && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 text-sm font-medium w-full">
                <Crown className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div className="flex flex-col w-full sm:w-auto">
                  <p className="text-sm font-medium text-gray-500">
                    Current Period -{" "}
                    {new Date(
                      subscription.current_period_start
                    ).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-medium text-gray-500">
                    Next Billing -{" "}
                    {new Date(
                      subscription.current_period_end
                    ).toLocaleDateString()}
                  </p>
                  <div className="mt-2 sm:mt-0">
                    <SubscriptionCancelInfo subscription={subscription} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              Welcome back, {userProfile?.full_name || user?.email}!
            </p>
          </div>
        
        </div>

        {/* Subscription */}

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Bookings"
            value={stats.thisMonth}
            note={`${stats.difference >= 0 ? "+" : ""}${stats.difference} from last month`}
          />
          <StatCard
            title="Active Bookings"
            value={stats.active}
            note="+1 from yesterday"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            note="+4 from last week"
          />
        </div>

        {/* Bookings + Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <RecentBookings bookings={recentBookings} />
          <QuickActions onBook={openBookingModal} />
        </div>
      </div>
    </main>
  );
}
