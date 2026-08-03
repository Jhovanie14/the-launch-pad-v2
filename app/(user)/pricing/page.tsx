"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { usePricingPlans } from "@/hooks/usePricingPlans";
import PricingCard from "@/components/pricing-plan";
import LoadingDots from "@/components/loading";
import { motion } from "motion/react";
import { gridStagger, pageRise, pageStagger } from "@/lib/motion";

export default function PricingContent() {
  const [pricing, setPricing] = useState<"monthly" | "yearly">("monthly");
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
      <div className="bg-red-600 px-4 py-3 text-center text-white">
        <p className="text-base md:text-xl font-semibold tracking-tight text-balance">
          Get 10% Off on the 1st month when you subscribe today!
        </p>
      </div>

      <section className="relative overflow-hidden py-14 md:py-20">
        <div className="container relative z-10 mx-auto px-5">
          <motion.div
            variants={pageStagger}
            initial="hidden"
            animate="show"
            className="mx-auto max-w-3xl text-center"
          >
            <motion.h1
              variants={pageRise}
              className="text-balance text-4xl font-black leading-[1.02] tracking-[-0.03em] text-blue-900 sm:text-5xl md:text-6xl"
            >
              Unlimited wash memberships
            </motion.h1>

            <motion.p
              variants={pageRise}
              className="mt-5 text-lg text-slate-600 md:text-xl"
            >
              Any vehicle · One price · Unlimited
            </motion.p>

            <motion.p
              variants={pageRise}
              className="mt-2 text-lg font-bold text-blue-900"
            >
              Wash twice and the membership pays for itself
            </motion.p>

            <motion.ul
              variants={pageRise}
              className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-600"
            >
              {["No contracts", "Cancel anytime", "Professional equipment"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle
                      className="h-4 w-4 text-green-600"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                )
              )}
            </motion.ul>
          </motion.div>
        </div>
      </section>
      <div className="py-12 bg-linear-to-b from-white to-blue-50">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-7xl">
            {/* Billing cycle toggle */}
            <div className="mb-12 flex justify-center">
              <div
                role="group"
                aria-label="Billing cycle"
                className="inline-flex rounded-lg bg-gray-100 p-1"
              >
                {(
                  [
                    { value: "monthly", label: "Monthly" },
                    { value: "yearly", label: "Yearly (Save 20%)" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPricing(option.value)}
                    aria-pressed={pricing === option.value}
                    className={`rounded-md px-6 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${
                      pricing === option.value
                        ? "bg-white text-blue-900 shadow-sm"
                        : "text-gray-600 hover:text-blue-900"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing Cards */}
            <motion.section
              variants={gridStagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-8 px-2 md:grid-cols-3"
            >
              {plans.map((plan) => (
                <motion.div key={plan.id} variants={pageRise} className="flex">
                  <PricingCard
                    plan={plan}
                    pricing={pricing}
                    subscription={subscription}
                    handleCheckout={handleCheckout}
                  />
                </motion.div>
              ))}
            </motion.section>
          </div>
        </div>
      </div>
    </main>
  );
}
