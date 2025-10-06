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

export default function DashboardPage() {
  const { user, userProfile, isLoading } = useAuth();
  const { openBookingModal } = useBooking();
  const { stats, recentBookings } = useBookingStats();
  const { subscription } = useSubscription();

  return (
    <main className="py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              {subscription && (
                <>
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Current Period -{" "}
                      {new Date(
                        subscription.current_period_start
                      ).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-900"></p>
                    <p className="text-sm font-medium text-gray-500">
                      Next Billing - {""}
                      {new Date(
                        subscription.current_period_end
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </>
              )}
            </div>
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
