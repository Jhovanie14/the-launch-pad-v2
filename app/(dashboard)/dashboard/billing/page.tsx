"use client";

import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionStatus from "@/components/subscription-status";
import Link from "next/link";
import { useState } from "react";
import SubscriptionCancelInfo from "@/components/user/subscription-cancel-info";
import { useSelfServiceSubscription } from "@/hooks/useSelfServiceSubscription";
import SelfServiceSubscriptionStatus from "@/components/self-service-subscription-status";

export default function BillingPage() {
  const { subscription, loading, error } = useSubscription();
  const { subscription: selfSubs, loading: selfloading } =
    useSelfServiceSubscription();
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

      const result = await res.json();
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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Billing & Subscription
      </h1>

      {/* Subscription status */}
      <SubscriptionStatus subscription={subscription} />
      <SelfServiceSubscriptionStatus subscription={selfSubs} />
      {/* Show cancellation info if scheduled */}
      {subscription && <SubscriptionCancelInfo subscription={subscription} />}

      {/* Billing management section */}
      {subscription && (
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Manage Subscription
          </h2>
          <div className="flex space-x-3">
            <Link
              href="/dashboard/pricing"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Upgrade Plan
            </Link>

            <button
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {canceling ? "Canceling..." : "Cancel Subscription"}
            </button>
          </div>
        </div>
      )}

      {/* If no subscription, prompt to choose plan */}
      {/* {!subscription && (
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Get Started
          </h2>
          <p className="text-gray-600 mb-4">
            You don’t have an active subscription. Choose a plan to unlock
            premium features.
          </p>
          <a
            href="/dashboard/pricing"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View Plans
          </a>
        </div>
      )} */}
    </div>
  );
}
