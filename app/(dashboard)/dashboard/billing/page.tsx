"use client";

import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionStatus from "@/components/subscription-status";
import Link from "next/link";
import { useState } from "react";
import SubscriptionCancelInfo from "@/components/user/subscription-cancel-info";
import { useSelfServiceSubscription } from "@/hooks/useSelfServiceSubscription";
import SelfServiceSubscriptionStatus from "@/components/self-service-subscription-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Settings, AlertCircle } from "lucide-react";

export default function BillingPage() {
  const { subscription, loading, error } = useSubscription();
  const { subscription: selfSubs } = useSelfServiceSubscription();
  const [canceling, setCanceling] = useState(false);

  async function handleCancelSubscription() {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;

    try {
      setCanceling(true);
      const res = await fetch("/api/cancel-subscription", { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        alert(
          `Failed to cancel subscription: ${data.error || "Unknown error"}`
        );
        return;
      }

      await res.json();
      alert(
        "Your subscription will be canceled at the end of the billing period."
      );
      window.location.reload(); // refresh UI to reflect new status
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert("An unexpected error occurred.");
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        {/* Header */}
        <div className="h-8 w-56 bg-gray-200 rounded"></div>

        {/* Subscription status */}
        <div className="h-20 bg-gray-200 rounded-lg"></div>

        {/* Manage subscription skeleton */}
        <div className="bg-white overflow-hidden shadow rounded-lg p-6 space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded"></div>
          <div className="flex space-x-3">
            <div className="h-10 w-40 bg-gray-200 rounded-md"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-md"></div>
            <div className="h-10 w-36 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-red-500">Error loading billing info: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Billing & Subscription
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your subscription, payment methods, and billing information
        </p>
      </div>

      {/* Express Detailing Subscription */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Express Detailing Subscription
        </h2>
        <SubscriptionStatus subscription={subscription} />
        {subscription && <SubscriptionCancelInfo subscription={subscription} />}
      </div>

      {/* Self-Service Subscription */}
      {selfSubs && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Self-Service Subscription
          </h2>
          <SelfServiceSubscriptionStatus subscription={selfSubs} />
        </div>
      )}

      {/* Management Actions */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Manage Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Update your subscription plan, payment method, or cancel your
              subscription at any time.
            </p>
            <Separator />
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/pricing">
                  <Settings className="w-4 h-4 mr-2" />
                  Change Plan
                </Link>
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={canceling}
              >
                {canceling ? "Canceling..." : "Cancel Subscription"}
              </Button>
            </div>
            {subscription.cancel_at_period_end && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Subscription Scheduled for Cancellation
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Your subscription will end on{" "}
                      {new Date(
                        subscription.current_period_end
                      ).toLocaleDateString()}
                      . You'll continue to have access until then.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            If you have questions about your subscription or billing, we're here
            to help.
          </p>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/help">Contact Support</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/pricing">View All Plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
