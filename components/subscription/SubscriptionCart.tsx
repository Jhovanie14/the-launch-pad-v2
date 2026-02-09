"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Loader2, Tag } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import TermsModal from "../terms-modal";
import LoadingDots from "../loading";

type Billing = "monthly" | "yearly";

interface SubscriptionCartProps {
  planId?: string | null;
  billingCycle?: Billing | null;
  auto?: boolean;
  onRequireAuth?: () => void;
}

interface Vehicle {
  license_plate: string;
}

export default function SubscriptionCart({
  planId: planIdProp,
  billingCycle: billingProp,
  auto = false,
  onRequireAuth,
}: SubscriptionCartProps) {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user } = useAuth();

  const planId = useMemo(
    () => planIdProp ?? searchParams.get("plan"),
    [planIdProp, searchParams]
  );
  const billingCycle = useMemo(
    () =>
      (billingProp ?? (searchParams.get("billing") as Billing)) || "monthly",
    [billingProp, searchParams]
  );

  const [plan, setPlan] = useState<{
    id: string;
    name: string;
    monthly_price: number | string;
    yearly_price: number | string;
    features?: string[];
    stripe_price_id_monthly?: string;
    stripe_price_id_yearly?: string;
  } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [vehicleCount, setVehicleCount] = useState(1);
  const [vehicles, setVehicles] = useState<Vehicle[]>([{ license_plate: "" }]);
  const [errors, setErrors] = useState<Record<number, { licensePlate?: string }>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem("pendingSubscriptionCart");
    if (savedCart && user) {
      try {
        const cartData = JSON.parse(savedCart);

        if (cartData.vehicles && cartData.vehicles.length > 0) {
          setVehicles(cartData.vehicles);
          setVehicleCount(cartData.vehicles.length);
        }

        if (cartData.isAuthorized) {
          setIsAuthorized(true);
        }

        localStorage.removeItem("pendingSubscriptionCart");

        if (cartData.autoCheckout) {
          setTimeout(() => {
            startCheckout();
          }, 500);
        }
      } catch (error) {
        console.error("Error restoring cart:", error);
      }
    }
  }, [user]);

  // Promo configuration
  const PROMO_CONFIG = {
    enabled: true,
    stripeCouponId_Subscription: "ASjZf72k",
    isSubscriptionPercent: 10,
  };

  useEffect(() => {
    if (!planId) return;
    let active = true;
    setLoadingPlan(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("id", planId)
          .single();

        if (!active) return;
        if (!error) setPlan(data);
      } finally {
        if (active) setLoadingPlan(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [planId, supabase]);

  // Handle vehicle count change
  const handleVehicleCountChange = (count: number) => {
    setVehicleCount(count);
    setVehicles((prev) => {
      const newVehicles = Array(count).fill(null).map((_, i) => 
        prev[i] || { license_plate: "" }
      );
      return newVehicles;
    });
    setErrors({});
  };

  // Update vehicle license plate
  const updateVehicle = (index: number, licensePlate: string) => {
    setVehicles((prev) => {
      const updated = [...prev];
      updated[index] = { license_plate: licensePlate };
      return updated;
    });
    // Clear error for this field
    setErrors((prev) => {
      const updated = { ...prev };
      if (updated[index]) {
        delete updated[index].licensePlate;
      }
      return updated;
    });
  };

  // Validate vehicles
  const validate = () => {
    const newErrors: Record<number, { licensePlate?: string }> = {};
    let isValid = true;

    vehicles.forEach((vehicle, index) => {
      if (!vehicle.license_plate || vehicle.license_plate.trim() === "") {
        newErrors[index] = { licensePlate: "License plate is required" };
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const promoDiscountPercent = PROMO_CONFIG.enabled
    ? PROMO_CONFIG.isSubscriptionPercent
    : 0;

  // Calculate base price
  const basePrice = useMemo(() => {
    const price =
      billingCycle === "monthly" ? plan?.monthly_price : plan?.yearly_price;
    const originalPrice = price ? Number(price) : 0;

    const estimatedDiscount = originalPrice * (promoDiscountPercent / 100);
    const estimatedDiscountedPrice = originalPrice - estimatedDiscount;

    return {
      original: originalPrice,
      estimatedDiscounted: estimatedDiscountedPrice,
      estimatedSavings: estimatedDiscount,
    };
  }, [plan, billingCycle, promoDiscountPercent]);

  // Calculate pricing for each vehicle
  const vehiclePricing = useMemo(() => {
    return vehicles.map((v, index) => {
      const isFirstVehicle = index === 0;
      const vehicleBase = basePrice.original;

      const price = isFirstVehicle ? vehicleBase : vehicleBase * 0.9;
      const flockDiscount = isFirstVehicle ? 0 : vehicleBase * 0.1;

      const estimatedPrice = price * (1 - promoDiscountPercent / 100);
      const promoSavings = price * (promoDiscountPercent / 100);

      return {
        originalPrice: price,
        estimatedPrice,
        promoSavings,
        flockDiscount,
        isDiscounted: !isFirstVehicle,
      };
    });
  }, [vehicles, basePrice, promoDiscountPercent]);

  // Calculate totals
  const totalOriginalPrice = useMemo(() => {
    return vehiclePricing.reduce((sum, item) => sum + item.originalPrice, 0);
  }, [vehiclePricing]);

  const totalEstimatedPrice = useMemo(() => {
    return vehiclePricing.reduce((sum, item) => sum + item.estimatedPrice, 0);
  }, [vehiclePricing]);

  const totalPromoSavings = useMemo(() => {
    return vehiclePricing.reduce((sum, item) => sum + item.promoSavings, 0);
  }, [vehiclePricing]);

  const totalFlockSavings = useMemo(() => {
    return vehiclePricing
      .filter((v) => v.isDiscounted)
      .reduce((sum, v) => sum + v.flockDiscount, 0);
  }, [vehiclePricing]);

  const startCheckout = async () => {
    try {
      setError("");
      if (!isAuthorized) {
        setError("You must authorize recurring charges to continue.");
        return;
      }
      if (!validate()) {
        setError("Please fill in all required vehicle information.");
        return;
      }

      setLoadingCheckout(true);

      const vehiclesPayload = vehicles.map((vehicle) => ({
        license_plate: vehicle.license_plate,
      }));

      const couponId = PROMO_CONFIG.enabled
        ? PROMO_CONFIG.stripeCouponId_Subscription
        : undefined;

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
          userId: user?.id,
          vehicles: vehiclesPayload,
          couponId: couponId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout session failed");

      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(errorMessage);
      setLoadingCheckout(false);
    }
  };

  const handleCheckoutClick = async () => {
    if (!user) {
      const cartData = {
        vehicles: vehicles.map((v) => ({
          license_plate: v.license_plate,
        })),
        isAuthorized,
        planId,
        billingCycle,
        autoCheckout: true,
      };

      localStorage.setItem("pendingSubscriptionCart", JSON.stringify(cartData));
      localStorage.setItem(
        "pendingSubscriptionIntent",
        JSON.stringify({ planId, billing: billingCycle })
      );

      onRequireAuth?.();
      return;
    }
    await startCheckout();
  };

  useEffect(() => {
    if (!auto) return;
    if (!user) return;
    if (!planId || !billingCycle) return;
    setIsAuthorized(true);
    startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, user, planId, billingCycle]);

  return (
    <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Primary Vehicle Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              Vehicle 1
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (Primary)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle-0" className="text-base">
                License Plate
              </Label>
              <Input
                id="vehicle-0"
                placeholder="Your vehicle"
                value={vehicles[0]?.license_plate || ""}
                onChange={(e) => updateVehicle(0, e.target.value.toUpperCase())}
                className="text-lg font-mono uppercase"
              />
              {errors[0]?.licensePlate && (
                <p className="text-red-500 text-sm">
                  {errors[0].licensePlate}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Family Vehicles Card - Always visible */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-2xl">How many vehicles</CardTitle>
              <span className="text-sm text-green-600 font-medium">
                Multi-Vehicle Benefits
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Vehicle Count Selector - Shows 1-4 for family vehicles */}
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => handleVehicleCountChange(count + 1)} // +1 because we have primary vehicle
                  className={`flex-1 py-4 rounded-lg border-2 text-xl font-semibold transition-all ${
                    vehicleCount === count + 1
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-green-600"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>

            {/* Family Vehicle License Plate Inputs (vehicles 2-5) */}
            {vehicleCount > 1 && (
              <div className="space-y-4">
                {vehicles.slice(1).map((vehicle, index) => {
                  const actualIndex = index + 1;
                  return (
                    <div key={actualIndex} className="space-y-2">
                      <Label htmlFor={`vehicle-${actualIndex}`} className="text-base font-semibold">
                        Vehicle {index + 1}: License Plate
                        <span className="ml-2 text-sm font-normal text-green-600">
                          (10% Family Discount)
                        </span>
                      </Label>
                      <Input
                        id={`vehicle-${actualIndex}`}
                        placeholder="Your vehicle"
                        value={vehicle.license_plate}
                        onChange={(e) => updateVehicle(actualIndex, e.target.value.toUpperCase())}
                        className="text-lg font-mono uppercase"
                      />
                      {errors[actualIndex]?.licensePlate && (
                        <p className="text-red-500 text-sm">
                          {errors[actualIndex].licensePlate}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-medium">{plan?.name ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground capitalize">
                  {billingCycle}
                </p>
              </div>
            </div>

            {/* Promo Code Applied Banner */}
            {PROMO_CONFIG.enabled && promoDiscountPercent > 0 && (
              <div className="bg-linear-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="bg-red-600 rounded-full p-2 shrink-0">
                    <Tag className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-red-900 mb-1">
                      🎉 Promo Code Auto-Applied!
                    </p>
                    <p className="text-sm font-semibold text-red-800">
                      {promoDiscountPercent}% OFF your first month of
                      subscription. After the first month, your subscription
                      will renew at the regular price.
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Discount applied automatically at checkout via Stripe
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6 pb-6 border-b border-border">
              {/* Vehicle Breakdown */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm mb-2">Vehicles</h4>
                {vehicles.map((vehicle, index) => {
                  const pricing = vehiclePricing[index];

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          Vehicle {index + 1}
                          {index === 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (Primary)
                            </span>
                          )}
                        </p>

                        <div className="flex flex-col gap-0.5 mt-1">
                          {pricing.isDiscounted && (
                            <p className="text-xs text-green-600">
                              Family: 10% off (-$
                              {pricing.flockDiscount.toFixed(2)})
                            </p>
                          )}
                          {PROMO_CONFIG.enabled && pricing.promoSavings > 0 && (
                            <p className="text-xs text-red-600 font-semibold">
                              Promo: {promoDiscountPercent}% off (-$
                              {pricing.promoSavings.toFixed(2)})
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {PROMO_CONFIG.enabled && (
                          <p className="text-xs text-muted-foreground line-through">
                            ${pricing.originalPrice.toFixed(2)}
                          </p>
                        )}
                        <p
                          className={`font-semibold ${PROMO_CONFIG.enabled ? "text-red-600" : ""}`}
                        >
                          $
                          {PROMO_CONFIG.enabled
                            ? pricing.estimatedPrice.toFixed(2)
                            : pricing.originalPrice.toFixed(2)}
                          <span className="text-xs text-muted-foreground ml-1">
                            {billingCycle === "monthly" ? "/mo" : "/yr"}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Savings Summary */}
              {PROMO_CONFIG.enabled &&
                (totalPromoSavings > 0 || totalFlockSavings > 0) && (
                  <div className="bg-green-50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-green-900">
                      💰 Your Estimated Savings:
                    </p>
                    {totalFlockSavings > 0 && (
                      <p className="text-xs text-green-700">
                        • Family Discount: $
                        {totalFlockSavings.toFixed(2)}
                      </p>
                    )}
                    {totalPromoSavings > 0 && (
                      <p className="text-xs text-green-700">
                        • Promo Discount: ${totalPromoSavings.toFixed(2)}
                      </p>
                    )}
                    <p className="text-xs font-bold text-green-900 pt-1 border-t border-green-200">
                      Total Estimated Savings: $
                      {(totalPromoSavings + totalFlockSavings).toFixed(2)}
                      <span className="text-muted-foreground ml-1">
                        {billingCycle === "monthly" ? "/month" : "/year"}
                      </span>
                    </p>
                  </div>
                )}

              {/* Total Price */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <span className="text-sm text-muted-foreground block">
                    {PROMO_CONFIG.enabled ? "Estimated Total" : "Total"}
                  </span>
                  <span className="text-2xl font-bold text-amber-400">
                    $
                    {PROMO_CONFIG.enabled
                      ? totalEstimatedPrice.toFixed(2)
                      : totalOriginalPrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">
                    {billingCycle === "monthly" ? "/month" : "/year"}
                  </span>
                </div>
                {PROMO_CONFIG.enabled && (
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">
                      Was
                    </span>
                    <span className="text-lg text-muted-foreground line-through">
                      ${totalOriginalPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Billing Cycle Info */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              {PROMO_CONFIG.enabled ? (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-semibold text-foreground">
                      Estimated: ${totalEstimatedPrice.toFixed(2)}
                    </span>{" "}
                    will be billed{" "}
                    <span className="font-semibold">
                      {billingCycle === "monthly" ? "monthly" : "annually"}
                    </span>{" "}
                    after promo discount is applied at checkout.
                  </p>
                  <p className="text-xs text-red-600 font-semibold">
                    ⚠️ Final price will be calculated by Stripe at checkout with
                    the promo code applied.
                  </p>
                  {(totalPromoSavings > 0 || totalFlockSavings > 0) && (
                    <p className="text-xs text-green-600 mt-2 font-semibold">
                      ✨ Estimated total savings: $
                      {(totalPromoSavings + totalFlockSavings).toFixed(2)}/
                      {billingCycle === "monthly" ? "month" : "year"}!
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    ${totalOriginalPrice.toFixed(2)}
                  </span>{" "}
                  will be billed{" "}
                  <span className="font-semibold">
                    {billingCycle === "monthly" ? "monthly" : "annually"}
                  </span>{" "}
                  on the same date each billing cycle.
                </p>
              )}
            </div>

            {plan?.features?.length ? (
              <div className="space-y-4 mb-6 pb-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  What's Included
                </h3>
                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <p className="font-medium text-foreground">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex mb-6">
              <Checkbox
                className="mr-3 w-5 h-5 border-2 border-black rounded-md"
                id="authorized"
                checked={isAuthorized}
                onCheckedChange={(checked) => {
                  setIsAuthorized(!!checked);
                  if (checked) setError("");
                }}
              />
              <p className="text-xs text-accent-foreground leading-relaxed">
                I authorized The Launch Pad to automatically charge the selected
                payment method{" "}
                <span className="font-semibold">
                  $
                  {PROMO_CONFIG.enabled
                    ? totalOriginalPrice.toFixed(2)
                    : totalOriginalPrice.toFixed(2)}
                  {billingCycle === "monthly" ? "/month" : "/year"}
                </span>{" "}
                after my first month which is discounted to{" "}
                <span className="font-semibold">
                  $
                  {PROMO_CONFIG.enabled
                    ? totalEstimatedPrice.toFixed(2)
                    : totalOriginalPrice.toFixed(2)}
                  {billingCycle === "monthly" ? "/month" : "/year"}
                </span>{" "}
                Billing will occur on the same subscription date each month
                until I cancel or terminate my membership{" "}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-blue-900 hover:underline"
                >
                  Terms of Service Agreement
                </button>
                , including the disclaimer of warranties, limitation of
                liability, and arbitration agreement.
              </p>
            </div>

            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

            <Button
              className="w-full bg-blue-900 hover:bg-blue-700"
              onClick={handleCheckoutClick}
              disabled={loadingCheckout || loadingPlan || !planId}
            >
              {loadingCheckout ? "Redirecting..." : "Checkout"}
              {loadingCheckout && <Loader2 className="ml-2 w-4 h-4 animate-spin" />}
            </Button>
          </CardContent>
        </Card>
        <TermsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </div>
  );
}