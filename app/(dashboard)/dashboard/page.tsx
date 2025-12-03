"use client";

import { useBooking } from "@/context/bookingContext";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useBookingStats } from "@/hooks/useBooking";
import RecentBookings from "@/components/recent-bookings";
import QuickActions from "@/components/qucik-actions";
import StatCard from "@/components/stats-card";
import { useSubscription } from "@/hooks/useSubscription";
import { useSelfServiceSubscription } from "@/hooks/useSelfServiceSubscription";
import {
  Crown,
  Calendar,
  CreditCard,
  Car,
  Sparkles,
  ArrowRight,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
import SubscriptionCancelInfo from "@/components/user/subscription-cancel-info";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function DashboardPage() {
  const { user, userProfile, isLoading } = useAuth();
  const { openBookingModal } = useBooking();
  const { stats, recentBookings } = useBookingStats();
  const { subscription } = useSubscription();
  const { subscription: selfServiceSubscription } =
    useSelfServiceSubscription();

  // Calculate express subscription pricing and details
  const subscriptionDetails = useMemo(() => {
    if (!subscription || !subscription.subscription_plans) {
      return null;
    }

    const basePrice =
      subscription.billing_cycle === "month"
        ? Number(subscription.subscription_plans.monthly_price ?? 0)
        : Number(subscription.subscription_plans.yearly_price ?? 0);

    const vehicles = subscription.vehicles || [];
    const vehiclePricing = vehicles.map((vehicle: any, index: number) => {
      const isFirstVehicle = index === 0;
      return {
        price: isFirstVehicle ? basePrice : basePrice * 0.9,
        isDiscounted: !isFirstVehicle,
      };
    });

    const totalPrice = vehiclePricing.reduce(
      (sum: number, item) => sum + item.price,
      0
    );
    const totalSavings = vehiclePricing.reduce(
      (sum: number, item) => sum + (item.isDiscounted ? basePrice * 0.1 : 0),
      0
    );

    return {
      planName: subscription.subscription_plans.name,
      basePrice,
      totalPrice,
      totalSavings,
      vehicleCount: vehicles.length,
      isFlock: vehicles.length > 1,
      billingCycle: subscription.billing_cycle,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }, [subscription]);

  // Calculate self-service subscription pricing and details
  const selfServiceDetails = useMemo(() => {
    if (
      !selfServiceSubscription ||
      !selfServiceSubscription.subscription_plans
    ) {
      return null;
    }

    const basePrice = Number(
      selfServiceSubscription.subscription_plans.monthly_price ?? 0
    );

    const vehicles = selfServiceSubscription.vehicles || [];
    const vehiclePricing = vehicles.map((vehicle: any, index: number) => {
      const isFirstVehicle = index === 0;
      return {
        price: isFirstVehicle ? basePrice : basePrice * 0.9,
        isDiscounted: !isFirstVehicle,
      };
    });

    const totalPrice = vehiclePricing.reduce(
      (sum: number, item) => sum + item.price,
      0
    );
    const totalSavings = vehiclePricing.reduce(
      (sum: number, item) => sum + (item.isDiscounted ? basePrice * 0.1 : 0),
      0
    );

    return {
      planName: selfServiceSubscription.subscription_plans.name,
      basePrice,
      totalPrice,
      totalSavings,
      vehicleCount: vehicles.length,
      isFlock: vehicles.length > 1,
      billingCycle: selfServiceSubscription.billing_cycle || "month",
      currentPeriodStart: selfServiceSubscription.current_period_start,
      currentPeriodEnd: selfServiceSubscription.current_period_end,
      status: selfServiceSubscription.status,
      cancelAtPeriodEnd: selfServiceSubscription.cancel_at_period_end,
    };
  }, [selfServiceSubscription]);

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
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {userProfile?.full_name || user?.email}!
            </p>
          </div>

          {/* Express Detailing Subscription Banner */}
          {subscription && subscriptionDetails && (
            <Card className="bg-linear-to-r from-blue-900 to-blue-800 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                      <Crown className="w-8 h-8 text-yellow-300" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold">
                          {subscriptionDetails.planName}
                        </h2>
                        <span className="inline-flex items-center px-2 py-1 bg-blue-700/50 rounded-full text-xs font-medium">
                          Express Detailing
                        </span>
                        {subscriptionDetails.isFlock && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                            <Sparkles className="w-3 h-3" />
                            Flock Subscription
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 bg-green-500/20 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-blue-200" />
                          <span className="text-blue-100">
                            {subscriptionDetails.vehicleCount} Vehicle
                            {subscriptionDetails.vehicleCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-200" />
                          <span className="text-blue-100">
                            ${subscriptionDetails.totalPrice.toFixed(2)}/
                            {subscriptionDetails.billingCycle}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-200" />
                          <span className="text-blue-100">
                            Next:{" "}
                            {new Date(
                              subscriptionDetails.currentPeriodEnd
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {subscriptionDetails.isFlock &&
                        subscriptionDetails.totalSavings > 0 && (
                          <p className="text-xs text-blue-200 mt-1">
                            ✨ You're saving $
                            {subscriptionDetails.totalSavings.toFixed(2)}/
                            {subscriptionDetails.billingCycle} with your flock
                            discount!
                          </p>
                        )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      asChild
                      variant="secondary"
                      className="bg-white text-blue-900 hover:bg-blue-50"
                    >
                      <Link href="/dashboard/billing">
                        Manage Subscription
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    {subscriptionDetails.cancelAtPeriodEnd && (
                      <SubscriptionCancelInfo subscription={subscription} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Self-Service Subscription Banner */}
          {selfServiceSubscription && selfServiceDetails && (
            <Card className="bg-linear-to-r from-purple-900 to-purple-800 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                      <Wrench className="w-8 h-8 text-yellow-300" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold">
                          {selfServiceDetails.planName}
                        </h2>
                        <span className="inline-flex items-center px-2 py-1 bg-purple-700/50 rounded-full text-xs font-medium">
                          Self-Service
                        </span>
                        {selfServiceDetails.isFlock && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                            <Sparkles className="w-3 h-3" />
                            Flock Subscription
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 bg-green-500/20 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-purple-200" />
                          <span className="text-purple-100">
                            {selfServiceDetails.vehicleCount} Vehicle
                            {selfServiceDetails.vehicleCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-purple-200" />
                          <span className="text-purple-100">
                            ${selfServiceDetails.totalPrice.toFixed(2)}/
                            {selfServiceDetails.billingCycle}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-200" />
                          <span className="text-purple-100">
                            {selfServiceDetails.currentPeriodEnd
                              ? `Next: ${new Date(
                                  selfServiceDetails.currentPeriodEnd
                                ).toLocaleDateString()}`
                              : "Active"}
                          </span>
                        </div>
                      </div>
                      {selfServiceDetails.isFlock &&
                        selfServiceDetails.totalSavings > 0 && (
                          <p className="text-xs text-purple-200 mt-1">
                            ✨ You're saving $
                            {selfServiceDetails.totalSavings.toFixed(2)}/
                            {selfServiceDetails.billingCycle} with your flock
                            discount!
                          </p>
                        )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      asChild
                      variant="secondary"
                      className="bg-white text-purple-900 hover:bg-purple-50"
                    >
                      <Link href="/dashboard/billing">
                        Manage Subscription
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    {selfServiceDetails.cancelAtPeriodEnd && (
                      <div className="text-xs text-purple-200 text-center">
                        Scheduled for cancellation
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Subscription CTA */}
          {!subscription && (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-6 text-center">
                <Crown className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Unlock Premium Features
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Subscribe to get unlimited car washes and exclusive benefits
                </p>
                <Button asChild className="bg-blue-900 hover:bg-blue-800">
                  <Link href="/dashboard/pricing">View Plans</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

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
