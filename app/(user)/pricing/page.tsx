"use client";

import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";
import { Crown } from "lucide-react";
import { usePricingPlans } from "@/hooks/usePricingPlans";
import PricingCard from "@/components/pricing-plan";
import LoadingDots from "@/components/loading";
import { motion } from "framer-motion";

export default function PricingContent() {
  const [pricing, setPricing] = useState<"monthly" | "yearly">("monthly");
  const { user, userProfile } = useAuth();
  const { subscription } = useSubscription();
  const { plans, loading } = usePricingPlans();

  const handleCheckout = (planId: string) => {
    const billing = pricing; // "monthly" | "yearly"
    window.location.href = `/pricing/cart?plan=${encodeURIComponent(planId)}&billing=${billing}`;
  };

  if (loading) {
    return <LoadingDots />;
  }
  return (
    <main className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      <motion.div
        className="bg-linear-to-r from-red-500 to-red-600 text-white text-center py-4 px-4 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl md:text-3xl font-bold">
            Get 35% Off When You Apply Promo Code LAUNCHPAD35 at Checkout
          </span>
        </div>
      </motion.div>
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="py-12">
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
      </div>
    </main>
  );
}
