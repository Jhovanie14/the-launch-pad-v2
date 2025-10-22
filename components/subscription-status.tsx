import { useSubscription } from "@/hooks/useSubscription";
import { Subscription } from "@/types";
import Link from "next/link";

interface SubscriptionStatusProps {
  subscription: Subscription | null;
}

export default function SubscriptionStatus({
  subscription,
}: SubscriptionStatusProps) {
  if (!subscription) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
        <div className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-6 flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                Subscription Status
              </h3>
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  <svg
                    className="w-4 h-4 mr-1.5 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  No Active Subscription
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                You don't have an active subscription. Choose a plan to unlock
                premium features.
              </p>
              <div className="mt-4">
                <a
                  href="/dashboard/pricing"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View Plans
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active subscription display
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "past_due":
        return "bg-yellow-100 text-yellow-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return (
          <svg
            className="w-4 h-4 mr-1.5 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "past_due":
        return (
          <svg
            className="w-4 h-4 mr-1.5 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4 mr-1.5 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="ml-6 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Subscription Status
            </h3>
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  subscription.status
                )}`}
              >
                {getStatusIcon(subscription.status)}
                {subscription.status.charAt(0).toUpperCase() +
                  subscription.status.slice(1)}{" "}
                Subscription
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Plan</p>
                <p className="text-sm text-gray-900">
                  {subscription.subscription_plans?.name ||
                    subscription.plan_id}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Price</p>
                <p className="text-sm text-gray-900">
                  {subscription.subscription_plans
                    ? `${
                        subscription.billing_cycle === "month"
                          ? subscription.subscription_plans.monthly_price
                          : subscription.subscription_plans.yearly_price
                      } / ${subscription.billing_cycle}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Current Period
                </p>
                <p className="text-sm text-gray-900">
                  {new Date(
                    subscription.current_period_start
                  ).toLocaleDateString()}{" "}
                  -{" "}
                  {new Date(
                    subscription.current_period_end
                  ).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Next Billing
                </p>
                <p className="text-sm text-gray-900">
                  {new Date(
                    subscription.current_period_end
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Manage Subscription
              </Link>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Upgrade Plan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
