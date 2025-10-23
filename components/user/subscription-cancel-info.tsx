"use client";

import { Subscription } from "@/types";

export default function SubscriptionCancelInfo({
  subscription,
}: {
  subscription: Subscription;
}) {
  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  if (subscription.status === "active" && subscription.cancel_at_period_end) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <h3 className="text-base font-semibold text-yellow-800">
          Subscription Scheduled for Cancellation
        </h3>
        <p className="text-sm text-yellow-700 mt-1">
          Your subscription will remain active until{" "}
          <span className="font-medium">{endDate}</span>. After this date, your
          plan will automatically end and billing will stop.
        </p>
      </div>
    );
  }

  if (subscription.status === "canceled") {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
        <h3 className="text-base font-semibold text-gray-800">
          Subscription Ended
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Your subscription ended on{" "}
          <span className="font-medium">{endDate}</span>. You can re-subscribe
          anytime to regain premium access.
        </p>
      </div>
    );
  }

  return null;
}
