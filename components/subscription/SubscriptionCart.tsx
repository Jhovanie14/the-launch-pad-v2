"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Plus, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useVehicleFlock } from "@/hooks/useVehicleForm";
import { createClient } from "@/utils/supabase/client";
import TermsModal from "../terms-modal";
import LoadingDots from "../loading";

type Billing = "monthly" | "yearly";

interface SubscriptionCartProps {
  // If you want to drive it by URL, pass nothing and it will read from search params.
  planId?: string | null;
  billingCycle?: Billing | null;
  auto?: boolean; // auto-run checkout on mount if true (used after login resume)
  // Optional hooks to handle unauthenticated flows (open modal or redirect)
  onRequireAuth?: () => void;
}

export default function SubscriptionCart({
  planId: planIdProp,
  billingCycle: billingProp,
  auto = false,
  onRequireAuth,
}: SubscriptionCartProps) {
  const searchParams = useSearchParams();
  //   const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  //   const { subscription } = useSubscription();

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
  const {
    vehicles,
    addVehicle,
    removeVehicle,
    updateVehicle,
    errors,
    validate,
    canAddMore,
  } = useVehicleFlock();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const bodyTypeOptions: Record<string, string[]> = {
    Sedans: ["Sedan"],
    Suvs: ["SUV"],
    "Compact SUV": ["Compact SUV"],
    "Small Truck": ["Small Pickup Truck"],
    Van: ["Van"],
    "Big Trucks": ["Big Pickup Truck"],
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

  //   const basePrice =
  //     billingCycle === "monthly" ? plan?.monthly_price : plan?.yearly_price;
  //   const displayPrice = basePrice + extraFee;

  const basePrice = useMemo(() => {
    const price =
      billingCycle === "monthly" ? plan?.monthly_price : plan?.yearly_price;
    return price ? Number(price) : 0;
  }, [plan, billingCycle]);

  // Calculate pricing for each vehicle
  const vehiclePricing = useMemo(() => {
    return vehicles.map((_, index) => {
      const isFirstVehicle = index === 0;
      const price = isFirstVehicle ? basePrice : basePrice * 0.9; // 10% discount for additional vehicles
      const discount = isFirstVehicle ? 0 : basePrice * 0.1;
      return {
        price,
        discount,
        isDiscounted: !isFirstVehicle,
      };
    });
  }, [vehicles, basePrice]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    return vehiclePricing.reduce((sum, item) => sum + item.price, 0);
  }, [vehiclePricing]);

  const handleBodyTypeChange = (index: number, val: string) => {
    updateVehicle(index, { body_type: val });
  };

  const startCheckout = async () => {
    try {
      setError("");
      if (!isAuthorized) {
        setError("You must authorize recurring charges to continue.");
        return;
      }
      // Validate all vehicles
      if (!validate()) {
        setError("Please fill in all required vehicle information.");
        return;
      }

      setLoadingCheckout(true);

      const vehiclesPayload = vehicles.map((vehicle) => ({
        year: Number(vehicle.year),
        make: vehicle.make,
        model: vehicle.model,
        body_type: vehicle.body_type,
        color: vehicle.color,
        licensePlate: vehicle.licensePlate,
      }));

      // New subscription with multiple vehicles
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
          userId: user?.id,
          vehicles: vehiclesPayload,
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
      onRequireAuth?.();
      return;
    }
    await startCheckout();
  };

  // Optional auto-run after returning from signup/login
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
        {vehicles.map((vehicle, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Vehicle {index + 1}
                  {index === 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      (Primary)
                    </span>
                  )}
                  {index > 0 && (
                    <span className="ml-2 text-sm font-normal text-green-600">
                      (10% Family Discount)
                    </span>
                  )}
                </CardTitle>
                {vehicles.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVehicle(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={vehicle.year ?? ""}
                    onChange={(e) =>
                      updateVehicle(index, { year: e.target.value })
                    }
                    placeholder="e.g. 2022"
                  />
                  {errors[index]?.year && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors[index].year}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Make</Label>
                  <Input
                    value={vehicle.make}
                    onChange={(e) =>
                      updateVehicle(index, { make: e.target.value })
                    }
                    placeholder="e.g. Toyota"
                  />
                  {errors[index]?.make && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors[index].make}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={vehicle.model}
                    onChange={(e) =>
                      updateVehicle(index, { model: e.target.value })
                    }
                    placeholder="e.g. Camry"
                  />
                  {errors[index]?.model && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors[index].model}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    value={vehicle.color}
                    onChange={(e) =>
                      updateVehicle(index, { color: e.target.value })
                    }
                    placeholder="e.g. White"
                  />
                  {errors[index]?.color && (
                    <p className="text-red-500 text-sm">
                      {errors[index].color}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Body Type</Label>
                  {plan?.name && (
                    <Select
                      value={vehicle.body_type}
                      onValueChange={(val) => handleBodyTypeChange(index, val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            plan ? "Select Body Type" : "Loading plan..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {bodyTypeOptions[plan.name]?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors[index]?.body_type && (
                    <p className="text-red-500 text-sm">
                      {errors[index].body_type}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`licensePlate-${index}`}>License Plate</Label>
                  <Input
                    id={`licensePlate-${index}`}
                    placeholder="e.g., ABC123 (optional)"
                    value={vehicle.licensePlate ?? ""}
                    onChange={(e) =>
                      updateVehicle(index, { licensePlate: e.target.value })
                    }
                  />
                  {errors[index]?.licensePlate && (
                    <p className="text-red-500 text-sm">
                      {errors[index].licensePlate}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {canAddMore && (
          <>
            <Label className="text-xl">+ Add Family Vehicles</Label>
            <Button
              variant="outline"
              onClick={addVehicle}
              className="w-full"
              disabled={!canAddMore}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Family Vehicle
            </Button>
          </>
        )}

        {!canAddMore && vehicles.length >= 5 && (
          <p className="text-sm text-muted-foreground text-center">
            Maximum of 5 vehicles per subscription
          </p>
        )}
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
                <p className="text-sm text-muted-foreground">
                  Base: ${basePrice?.toFixed(2)}
                </p>
              </div>
            </div>

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
                        {vehicle.body_type && (
                          <p className="text-xs text-muted-foreground">
                            {vehicle.body_type}
                          </p>
                        )}
                        {pricing.isDiscounted && (
                          <p className="text-xs text-green-600 mt-1">
                            Flock Discount: 10% off
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {pricing.isDiscounted && (
                          <p className="text-xs text-muted-foreground line-through">
                            ${basePrice.toFixed(2)}
                          </p>
                        )}
                        <p className="font-semibold">
                          ${pricing.price.toFixed(2)}
                          <span className="text-xs text-muted-foreground ml-1">
                            {billingCycle === "monthly" ? "/mo" : "/yr"}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Price */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-2xl font-bold text-amber-400">
                  Total Monthly
                </span>
                <span className="text-2xl font-bold text-amber-400">
                  ${totalPrice.toFixed(2)}
                  <span className="text-sm text-muted-foreground ml-1">
                    {billingCycle === "monthly" ? "/month" : "/year"}
                  </span>
                </span>
              </div>
            </div>

            {/* Billing Cycle Info */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  ${totalPrice.toFixed(2)}
                </span>{" "}
                will be billed{" "}
                <span className="font-semibold">
                  {billingCycle === "monthly" ? "monthly" : "annually"}
                </span>{" "}
                on the same date each billing cycle.
              </p>
              {vehicles.length > 1 && (
                <p className="text-xs text-green-600 mt-2">
                  ✨ You're saving $
                  {(basePrice * 0.1 * (vehicles.length - 1)).toFixed(2)}/month
                  with your flock discount!
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
                      <div className="w-5 h-5 rounded-full bg-green flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-green-foreground" />
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
              <p className="text-xs text-muted-foreground leading-relaxed">
                I authorized The Launch Pad to automatically charge the selected
                payment method{" "}
                <span className="font-semibold">
                  ${totalPrice.toFixed(2)}
                  {billingCycle === "monthly" ? "/month" : "/year"}
                </span>{" "}
                each {billingCycle === "monthly" ? "month" : "year"} on the same
                date of subscription until my membership is cancelled or
                terminated.{" "}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-primary hover:underline"
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
              {loadingCheckout && <LoadingDots />}
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
