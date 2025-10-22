"use client";

import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionStatus from "@/components/subscription-status";

export default function BillingPage() {
  const { subscription, loading, error } = useSubscription();

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

      {/* Billing management section */}
      {subscription && (
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Manage Subscription
          </h2>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Update Payment Method
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Change Plan
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Cancel Subscription
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
