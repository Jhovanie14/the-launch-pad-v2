"use client";

import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";
import { CheckCircle, Crown } from "lucide-react";
import { usePricingPlans } from "@/hooks/usePricingPlans";
import PricingCard from "@/components/pricing-plan";
import LoadingDots from "@/components/loading";
import { motion } from "framer-motion";

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
          <span className="text-lg md:text-3xl font-bold">
            Get 35% Off on the 1st month when you subscribe today!
          </span>
        </div>
      </motion.div>
      <section className="relative py-12 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex justify-center mb-6">
              <Crown className="w-16 h-16 text-blue-900" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-blue-900 mb-6">
              UNLIMITED WASH MEMBERSHIPS
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-4">
              Any Vehicle • One Price • Unlimited
            </p>
            <p className="text-lg text-blue-900 font-bold mb-8">
              Wash twice → Membership pays for itself
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>No contracts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Professional equipment</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      <div className="py-12 bg-linear-to-b from-white to-blue-50">
        <div className="container mx-auto px-4">
         <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="max-w-4xl mx-auto text-center space-y-6"
          >
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
            <section className="grid grid-cols-1 md:grid-cols-2 gap-10 px-6 md:px-3">
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
          </motion.div>
        </div>
      </div>
    </main>
  );
}
