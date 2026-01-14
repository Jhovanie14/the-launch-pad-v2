import { useState } from "react";
import { Button } from "./ui/button";
import { SelfServiceSubscription } from "@/types";

interface SelfServiceSubscriptionStatusProps {
  subscription: SelfServiceSubscription | null;
}

export default function SelfServiceSubscriptionStatus({
  subscription,
}: SelfServiceSubscriptionStatusProps) {
  const [loading, setLoading] = useState(false);

  const handleUpdatePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/update-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe Billing Portal
      } else {
        alert("Unable to open payment update page.");
      }
    } catch (err) {
      console.error("Error updating payment method:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">
            Self-Service Subscription
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            You don't have an active self-service subscription. Choose a plan to
            unlock features.
          </p>
          <div className="mt-4">
            <a
              href="/dashboard/pricing"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800"
            >
              View Plans
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Status helper
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

  const formatDate = (date?: string | null) =>
    date ? new Date(date).toLocaleDateString() : "N/A";

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900">
          Self-Service Subscription
        </h3>
        <div className="mt-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
              subscription.status
            )}`}
          >
            {getStatusIcon(subscription.status)}{" "}
            {subscription.status.charAt(0).toUpperCase() +
              subscription.status.slice(1)}{" "}
            Subscription
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Plan</p>
            <p className="text-sm text-gray-900">
              {subscription.subscription_plans?.name || subscription.plan_id}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Price</p>
            <p className="text-sm text-gray-900">
              {subscription.billing_cycle
                ? `${
                    subscription.billing_cycle === "month"
                      ? subscription.subscription_plans?.monthly_price
                      : ""
                  } / ${subscription.billing_cycle}`
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Current Period</p>
            <p className="text-sm text-gray-900">
              {formatDate(subscription.current_period_start)} -{" "}
              {formatDate(subscription.current_period_end)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Next Billing</p>
            <p className="text-sm text-gray-900">
              {formatDate(subscription.current_period_end)}
            </p>
          </div>
          <div>
            <h4 className="text-md font-semibold text-gray-900">
              Linked Vehicles Plate Numbers
            </h4>

            {subscription.vehicles.length > 0 ? (
              subscription.vehicles.map((v) => (
                <p key={v.id}>
                  {v.license_plate}
                </p>
              ))
            ) : (
              <p className="text-sm text-gray-600 mt-1">No vehicles linked.</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={handleUpdatePayment}
            disabled={loading || subscription.status !== "active"}
          >
            {loading ? "Redirecting..." : "Update Payment Method"}
          </Button>
        </div>
      </div>
    </div>
  );
}
