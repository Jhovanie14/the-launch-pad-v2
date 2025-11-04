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
import { Check } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useVehicleForm } from "@/hooks/useVehicleForm";
import { createClient } from "@/utils/supabase/client";

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

  const [plan, setPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const { vehicleInfo, setVehicleInfo, errors, validate } = useVehicleForm();
  const [extraFee, setExtraFee] = useState(0);

  const upgradeFees: Record<string, number> = {
    SUV: 10,
    "Big Pickup Truck": 10,
  };

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

  const displayPrice =
    billingCycle === "monthly" ? plan?.monthly_price : plan?.yearly_price;

  const handleBodyTypeChange = (val: string) => {
    setVehicleInfo({ ...vehicleInfo, body_type: val });
    // setExtraFee(upgradeFees[val] || 0);
  };

  const startCheckout = async () => {
    try {
      setError("");
      if (!isAuthorized) {
        setError("You must authorize recurring charges to continue.");
        return;
      }
      // Validate vehicle
      if (!validate()) return;

      setLoadingCheckout(true);

      const vehiclePayload = {
        year: Number(vehicleInfo.year),
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        body_type: vehicleInfo.body_type,
        color: vehicleInfo.color,
      };

      // New subscription
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
          userId: user?.id,
          vehicle: vehiclePayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout session failed");

      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Something went wrong.");
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
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={vehicleInfo.year ?? ""}
                  onChange={(e) =>
                    setVehicleInfo({
                      ...vehicleInfo,
                      year: e.target.value,
                    })
                  }
                  placeholder="e.g. 2022"
                />
                {errors.year && (
                  <p className="text-red-600 text-sm mt-1">{errors.year}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  value={vehicleInfo.make}
                  onChange={(e) =>
                    setVehicleInfo({ ...vehicleInfo, make: e.target.value })
                  }
                  placeholder="e.g. Toyota"
                />
                {errors.make && (
                  <p className="text-red-600 text-sm mt-1">{errors.make}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={vehicleInfo.model}
                  onChange={(e) =>
                    setVehicleInfo({ ...vehicleInfo, model: e.target.value })
                  }
                  placeholder="e.g. Camry"
                />
                {errors.model && (
                  <p className="text-red-600 text-sm mt-1">{errors.model}</p>
                )}
              </div>
              <div>
                <Label>Color</Label>
                <Input
                  value={vehicleInfo.color}
                  onChange={(e) =>
                    setVehicleInfo({ ...vehicleInfo, color: e.target.value })
                  }
                  placeholder="e.g. White"
                />
                {errors.color && (
                  <p className="text-red-500 text-sm">{errors.color}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Body Type</Label>
                {plan?.name && (
                  <Select
                    value={vehicleInfo.body_type}
                    onValueChange={handleBodyTypeChange}
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
                {errors.body_type && (
                  <p className="text-red-500 text-sm">{errors.body_type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="licensePlate">License Plate</Label>
                <Input
                  id="licensePlate"
                  placeholder="e.g., ABC123"
                  value={vehicleInfo.licensePlate}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      licensePlate: e.target.value,
                    }))
                  }
                  required
                />
                {errors.licensePlate && (
                  <p className="text-red-500 text-sm">{errors.licensePlate}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
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
                <p className="text-2xl font-semibold">${displayPrice ?? 0}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6 pb-6 border-b border-border">
              {/* Extra Fee if applicable */}
              {extraFee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-medium">
                    Vehicle Type Upgrade
                  </span>
                  <span className="text-foreground font-semibold">
                    +${extraFee?.toFixed(2)}{" "}
                    {billingCycle === "monthly" ? "/month" : "/year"}
                  </span>
                </div>
              )}

              {/* Total Price */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-2xl font-bold text-amber-400">
                  You First Month
                </span>
                <span className="text-2xl font-bold text-amber-400">
                  ${displayPrice?.toFixed(2)}
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
                  ${displayPrice?.toFixed(2)}
                </span>{" "}
                will be billed{" "}
                <span className="font-semibold">
                  {billingCycle === "monthly" ? "monthly" : "annually"}
                </span>{" "}
                on the same date each billing cycle.
              </p>
            </div>

            {plan?.features?.length ? (
              <div className="space-y-4 mb-6 pb-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  What's Included
                </h3>
                <div className="space-y-3">
                  {plan.features.map((feature: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green flex items-center justify-center flex-shrink-0 mt-0.5">
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
                paymenth method{" "}
                {billingCycle === "monthly"
                  ? `$${plan?.monthly_price}/month`
                  : `$${plan?.yearly_price}/year`}{" "}
                each month on the same date of subscripion until my membership
                is cancelled or terminated.{" "}
                <a href="#" className="text-primary hover:underline">
                  Terms of Service Agreement
                </a>
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
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
