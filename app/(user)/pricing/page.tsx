"use client";

import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";
import { Crown } from "lucide-react";
import AuthPromptModal from "@/components/user/authPromptModal";
import { usePricingPlans } from "@/hooks/usePricingPlans";
import PricingCard from "@/components/pricing-plan";
import SubscriptionCart from "@/components/subscription/SubscriptionCart";

export default function PricingContent() {
  const [pricing, setPricing] = useState<"monthly" | "yearly">("monthly");
  const [authOpen, setAuthOpen] = useState(false);
  const { user, userProfile } = useAuth();
  const { subscription } = useSubscription();
  const { plans, loading } = usePricingPlans();

  const handleCheckout = (planId: string) => {
    const billing = pricing; // "monthly" | "yearly"
    window.location.href = `/pricing/cart?plan=${encodeURIComponent(planId)}&billing=${billing}`;
  };

  if (loading) {
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
  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="py-20">
          <div className="space-y-3 mb-8 text-center">
            {user ? (
              <>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Crown className="w-8 h-8 text-blue-900" />
                  <h1 className="text-4xl md:text-6xl font-semibold text-blue-900">
                    Manage Your Subscription
                  </h1>
                </div>
                <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
                  Welcome back, {userProfile?.full_name || user.email}!
                  {userProfile?.provider === "google" && (
                    <span className="block text-sm text-blue-600 mt-1">
                      Signed in with Google
                    </span>
                  )}
                </p>
                {/* <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    // onClick={handleManageSubscription}
                    className="bg-blue-900 text-white hover:bg-blue-800"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div> */}
              </>
            ) : (
              <>
                <h1 className="text-4xl md:text-6xl font-semibold text-blue-900">
                  Choose Your Plan
                </h1>
                <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
                  Select the perfect plan for your car care needs
                </p>
              </>
            )}
          </div>

          {/* Pricing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setPricing("monthly")}
                className={`px-6 py-2 rounded-md transition-colors ${
                  pricing === "monthly"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-gray-600 hover:text-blue-900"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPricing("yearly")}
                className={`px-6 py-2 rounded-md transition-colors ${
                  pricing === "yearly"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-gray-600 hover:text-blue-900"
                }`}
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 md:px-0">
            {plans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                pricing={pricing}
                subscription={subscription}
                handleCheckout={handleCheckout}
              />
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
