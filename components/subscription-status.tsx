import { Subscription } from "@/types";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Car, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";

interface SubscriptionStatusProps {
  subscription: Subscription | null;
}

export default function SubscriptionStatus({
  subscription,
}: SubscriptionStatusProps) {
  const [loading, setLoading] = useState(false);

  // Calculate pricing for vehicles
  const pricing = useMemo(() => {
    if (!subscription || !subscription.subscription_plans) {
      return {
        basePrice: 0,
        totalPrice: 0,
        totalSavings: 0,
        vehiclePricing: [],
        isFlock: false,
      };
    }

    const basePrice =
      subscription.billing_cycle === "month"
        ? Number(subscription.subscription_plans.monthly_price ?? 0)
        : Number(subscription.subscription_plans.yearly_price ?? 0);

    const vehicles = subscription.vehicles || [];
    const vehiclePricing = vehicles.map((vehicle, index) => {
      const isFirstVehicle = index === 0;
      const price = isFirstVehicle ? basePrice : basePrice * 0.9;
      const discount = isFirstVehicle ? 0 : basePrice * 0.1;
      return {
        vehicle,
        price,
        discount,
        isDiscounted: !isFirstVehicle,
        displayName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      };
    });

    const totalPrice = vehiclePricing.reduce((sum, item) => sum + item.price, 0);
    const totalSavings = vehiclePricing.reduce(
      (sum, item) => sum + item.discount,
      0
    );

    return {
      basePrice,
      totalPrice,
      totalSavings,
      vehiclePricing,
      isFlock: vehicles.length > 1,
    };
  }, [subscription]);

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
    } catch (error) {
      console.error("Error updating payment method:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                Express Detailing Subscription
              </h3>
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  No Active Subscription
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                You don't have an active subscription. Choose a plan to unlock
                premium features.
              </p>
              <div className="mt-4">
                <Link
                  href="/dashboard/pricing"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active subscription display
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return {
          color: "bg-green-100 text-green-800",
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
          label: "Active",
        };
      case "past_due":
        return {
          color: "bg-yellow-100 text-yellow-800",
          icon: <AlertCircle className="w-4 h-4 text-yellow-600" />,
          label: "Past Due",
        };
      case "canceled":
        return {
          color: "bg-red-100 text-red-800",
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          label: "Canceled",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          icon: <AlertCircle className="w-4 h-4 text-gray-600" />,
          label: status.charAt(0).toUpperCase() + status.slice(1),
        };
    }
  };

  const statusInfo = getStatusInfo(subscription.status);

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Express Detailing Subscription
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mt-1 ${statusInfo.color}`}
              >
                {statusInfo.icon}
                {statusInfo.label}
              </span>
            </div>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Plan Name</p>
            <p className="text-base font-semibold text-gray-900 mt-1">
              {subscription.subscription_plans?.name || subscription.plan_id}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Billing Cycle</p>
            <p className="text-base font-semibold text-gray-900 mt-1 capitalize">
              {subscription.billing_cycle}ly
            </p>
          </div>
        </div>

        <Separator />

        {/* Vehicles Section */}
        {pricing.vehiclePricing.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900">
                {pricing.isFlock ? "Flock Vehicles" : "Vehicle"}
              </h4>
              {pricing.isFlock && (
                <span className="text-xs text-green-600 font-medium">
                  ✨ Flock Discount Active
                </span>
              )}
            </div>
            <div className="space-y-2">
              {pricing.vehiclePricing.map((item, index) => (
                <div
                  key={item.vehicle.id || index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Car className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.displayName}
                      </p>
                      {item.vehicle.body_type && (
                        <p className="text-xs text-gray-500">
                          {item.vehicle.body_type}
                        </p>
                      )}
                      {item.isDiscounted && (
                        <span className="text-xs text-green-600 font-medium mt-1 inline-block">
                          10% Flock Discount
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {item.isDiscounted && (
                      <p className="text-xs text-gray-400 line-through">
                        ${pricing.basePrice.toFixed(2)}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-gray-900">
                      ${item.price.toFixed(2)}
                      <span className="text-xs text-gray-500 ml-1">
                        /{subscription.billing_cycle}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {pricing.isFlock && pricing.totalSavings > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-green-600">
                  Total Flock Savings
                </span>
                <span className="text-sm font-semibold text-green-600">
                  -${pricing.totalSavings.toFixed(2)}/
                  {subscription.billing_cycle}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500">
            No vehicles linked to this subscription
          </div>
        )}

        <Separator />

        {/* Pricing Summary */}
        <div className="space-y-3">
          <h4 className="text-base font-semibold text-gray-900">
            Billing Summary
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Base Price</span>
              <span className="font-medium text-gray-900">
                ${pricing.basePrice.toFixed(2)}/{subscription.billing_cycle}
              </span>
            </div>
            {pricing.vehiclePricing.length > 1 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  {pricing.vehiclePricing.length - 1} Additional Vehicle(s)
                </span>
                <span className="font-medium text-gray-900">
                  ${(pricing.totalPrice - pricing.basePrice).toFixed(2)}/
                  {subscription.billing_cycle}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-base font-semibold text-gray-900">
                Total Monthly Billing
              </span>
              <span className="text-lg font-bold text-blue-900">
                ${pricing.totalPrice.toFixed(2)}/{subscription.billing_cycle}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Billing Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Current Period</p>
            <p className="text-sm text-gray-900 mt-1">
              {new Date(
                subscription.current_period_start
              ).toLocaleDateString()}{" "}
              - {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Next Billing Date</p>
            <p className="text-sm text-gray-900 mt-1">
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4">
          <Button
            onClick={handleUpdatePayment}
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800"
          >
            {loading ? "Redirecting..." : "Update Payment Method"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
