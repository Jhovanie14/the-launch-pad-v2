"use client";

import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Crown, X } from "lucide-react";
import Image from "next/image";

export default function PricingCard({
  plan,
  pricing,
  subscription,
  handleCheckout,
}: {
  plan: any;
  pricing: "monthly" | "yearly";
  subscription: any;
  handleCheckout: (planId: string) => void;
}) {
  const normalizedBillingCycle =
    subscription?.billing_cycle === "year"
      ? "yearly"
      : subscription?.billing_cycle === "month"
        ? "monthly"
        : subscription?.billing_cycle;

  // Detect if this is the self-service card
  const isSelfServicePlan = plan.name === "Self-Service Bay Membership";

  // Detect if the user has any subscription passed to this card
  const hasSubscription = Boolean(subscription);

  // Detect if this is a normal carwash plan the user currently has
  const isCurrentPlan =
    !isSelfServicePlan &&
    subscription?.plan_id === plan.id &&
    normalizedBillingCycle === pricing;

  // Button text logic
  let buttonText = `Select ${plan.name}`;

  if (hasSubscription) {
    if (isSelfServicePlan) {
      buttonText = "Add more vehicle";
    } else if (isCurrentPlan) {
      buttonText = "Current Plan";
    } else {
      buttonText = "Upgrade";
    }
  }

  // Popular plans
  const popularPlans = "Express Detail";
  const isPopular = popularPlans.includes(plan.name);

  // Calculate pricing with discount for yearly
  const monthlyPrice = Number(plan.monthly_price) || 0;
  const yearlyPrice = Number(plan.yearly_price) || 0;
  const monthlyEquivalent = monthlyPrice * 12;
  const isYearly = pricing === "yearly";
  const showDiscount = isYearly && monthlyEquivalent > 0;
  const discountPercentage = showDiscount
    ? Math.round(((monthlyEquivalent - yearlyPrice) / monthlyEquivalent) * 100)
    : 0;
  const currentPrice = isYearly ? yearlyPrice : monthlyPrice;
  const originalPrice = isYearly ? monthlyEquivalent : null;

  // ============================================
  // PROMO CODE DISCOUNT (COMMENT OUT WHEN PROMO ENDS)
  // ============================================
  const promoDiscountPercent = isSelfServicePlan ? 0 : 0.1;
  const originalPriceWithPromo = currentPrice;
  const discountedPriceWithPromo = currentPrice * (1 - promoDiscountPercent);

  // Calculate daily cost
  const dailyCost = isYearly
    ? (discountedPriceWithPromo / 365).toFixed(2)
    : (discountedPriceWithPromo / 30).toFixed(2);
  // ============================================

  return (
    <div className={`relative ${isPopular ? "md:scale-105" : ""}`}>
      <div
        className={`relative overflow-hidden rounded-xl border-4 transition-all duration-300 ${
          isPopular
            ? "border-yellow-400 shadow-xl"
            : isCurrentPlan
              ? "border-accent shadow-lg shadow-accent/20"
              : ""
        }`}
      >
        {/* Header Section with Gradient Background */}
        <div className="relative bg-linear-to-br from-blue-900 to-blue-800 p-6 overflow-hidden">
          {/* Popular Badge */}
          {isPopular && (
            <div className="absolute top-0 right-0 bg-yellow-400 text-slate-900 px-4 py-1 text-xs font-bold rounded-bl-lg z-10">
              BEST VALUE
            </div>
          )}

          {/* Current Plan Badge */}
          {isCurrentPlan && (
            <div className="absolute top-0 right-0 bg-linear-to-r from-yellow-400 to-yellow-500 text-slate-900 px-4 py-1 text-xs font-bold rounded-bl-lg z-10">
              CURRENT PLAN
            </div>
          )}

          {/* Yearly Discount Badge */}
          {showDiscount && discountPercentage > 0 && !promoDiscountPercent && (
            <div className="absolute top-0 left-0 bg-linear-to-r from-green-500 to-green-600 text-white px-3 py-1 text-xs font-bold rounded-br-lg z-10">
              {discountPercentage}% OFF
            </div>
          )}

          {/* Icon/Image */}
          <div className="mb-4 flex justify-center mt-4">
            {plan.image_url ? (
              <Image
                src={plan.image_url}
                alt={plan.name}
                width={80}
                height={80}
                className="w-20 h-20 object-cover rounded-full border-4 border-white/20"
              />
            ) : (
              <Crown className="w-20 h-20 text-yellow-400 stroke-1" />
            )}
          </div>

          {/* Plan Name */}
          <h3 className="text-2xl font-bold text-white text-center mb-4">
            {plan.name}
          </h3>

          {/* Pricing Section */}
          <div className="text-center mb-4">
            {/* ============================================
                PROMO CODE DISCOUNT DISPLAY (COMMENT OUT WHEN PROMO ENDS)
                ============================================ */}
            {promoDiscountPercent > 0 && !isSelfServicePlan && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-lg text-blue-200 line-through">
                  ${originalPriceWithPromo.toFixed(2)}
                </span>
                <span className="text-xs text-yellow-400 font-semibold bg-yellow-400/20 px-2 py-0.5 rounded">
                  Save {(promoDiscountPercent * 100).toFixed(0)}%
                </span>
              </div>
            )}

            <div className="text-4xl font-bold text-yellow-400">
              ${discountedPriceWithPromo.toFixed(2)}
            </div>
            <p className="text-blue-200 text-sm">
              per {pricing === "monthly" ? "month" : "year"}
            </p>

            {/* Daily Cost Breakdown */}
            <div className="mt-2 inline-block bg-yellow-400/20 px-3 py-1 rounded-full">
              <p className="text-yellow-400 font-bold text-lg">
                Only ${dailyCost}/day
              </p>
            </div>

            {/* Equivalent monthly price for yearly */}
            {isYearly && (
              <p className="text-blue-200 text-xs mt-2">
                ${(discountedPriceWithPromo / 12).toFixed(2)}/month billed
                annually
              </p>
            )}
            {/* ============================================
                ORIGINAL PRICE DISPLAY (UNCOMMENT WHEN PROMO ENDS)
                ============================================ */}
            {/* {showDiscount && originalPrice && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-lg text-blue-200 line-through">
                  ${originalPrice.toFixed(2)}
                </span>
                <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded">
                  Save ${(originalPrice - currentPrice).toFixed(2)}
                </span>
              </div>
            )}
            <div className="text-4xl font-bold text-yellow-400">
              ${currentPrice.toFixed(2)}
            </div>
            <p className="text-blue-200 text-sm">
              per {pricing === "monthly" ? "month" : "year"}
            </p>
            <div className="mt-2 inline-block bg-yellow-400/20 px-3 py-1 rounded-full">
              <p className="text-yellow-400 font-bold text-lg">
                Only ${dailyCost}/day
              </p>
            </div>
            {isYearly && (
              <p className="text-blue-200 text-xs mt-2">
                ${(currentPrice / 12).toFixed(2)}/month billed annually
              </p>
            )} */}
            {/* ============================================ */}
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white p-6">
          {/* Description */}
          <CardDescription className="text-base font-medium text-slate-700 leading-relaxed mb-6 text-center">
            {plan.description}
          </CardDescription>

          {/* Features List */}
          <ul className="space-y-3" role="list">
            {plan.features.map((feature: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                {feature.toLowerCase().includes("no") ? (
                  <X className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 shrink-0 text-yellow-400 mt-0.5" />
                )}
                <span className="text-sm md:text-base text-slate-800 font-medium">
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          {/* Savings Box (if applicable) */}
          {plan.savings_info && (
            <div className="mt-6 p-4 bg-blue-50 backdrop-blur-sm rounded-lg border border-blue-200">
              <p className="text-sm text-slate-800">
                <strong>Savings vs. pay-per-use:</strong> {plan.savings_info}
                <br />
                <span className="text-blue-600 text-xs">
                  {plan.savings_note}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer/CTA */}
        <div className="bg-white px-6 pb-6 pt-0">
          <Button
            className={`w-full font-semibold transition-all cursor-pointer py-6 text-base ${
              isPopular
                ? "bg-yellow-400 text-slate-900 hover:bg-yellow-500 border-2 border-yellow-500"
                : isCurrentPlan
                  ? "bg-accent text-accent-foreground hover:bg-accent/90"
                  : "bg-blue-900 text-white hover:bg-blue-800"
            }`}
            onClick={() => handleCheckout(plan.id)}
            aria-label={`Select ${plan.name} plan`}
            disabled={isCurrentPlan}
          >
            {buttonText}
          </Button>
          <p className="text-xs text-center text-slate-500 mt-3">
            1 Vehicle per subscription
          </p>
        </div>
      </div>
    </div>
  );
}
