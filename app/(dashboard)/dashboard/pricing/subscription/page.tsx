"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { useVehicleForm } from "@/hooks/useVehicleForm";
import { UserNavbar } from "@/components/user/navbar";
import { ensureVehicle } from "@/utils/vehicle";
import { Checkbox } from "@/components/ui/checkbox";

function SubscriptionCartContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();

  const planId = searchParams.get("plan");
  const billingCycle = searchParams.get("billing") as "monthly" | "yearly";
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [extraFee, setExtraFee] = useState(0);
  const upgradeFees: Record<string, number> = {
    SUV: 10,
    "Big Pickup Truck": 10,
  };

  const { vehicleInfo, setVehicleInfo, errors, validate } = useVehicleForm();

  const bodyTypeOptions: Record<string, string[]> = {
    Sedans: ["Sedan", "Coupe", "Convertible"],
    Suvs: ["SUV"],
    Van: ["Van"],
    "Compact SUV": ["Compact SUV"],
    Trucks: [ "Big Pickup Truck"],
    "Small Truck": [ "Small Pickup Truck"],
  };

  const handleBodyTypeChange = (val: string) => {
    setVehicleInfo({ ...vehicleInfo, body_type: val });

    // If selected body type has an upgrade fee
    setExtraFee(upgradeFees[val] || 0);
  };

  const handleCheckout = async () => {
    try {
      // ✅ Validate vehicle form
      if (!validate()) return;

      // ✅ 1. Insert vehicle first (or return existing if same year/make/model/trim for user)
      // const vehicle_Id = vehicleInfo
      //   ? await ensureVehicle({
      //       user_id: user?.id ?? null,
      //       year: Number(vehicleInfo.year),
      //       make: vehicleInfo.make,
      //       model: vehicleInfo.model,
      //       trim: vehicleInfo.trim,
      //       body_type: vehicleInfo.body_type,
      //       colors: [vehicleInfo.color],
      //     })
      //   : null;

      // ✅ 2. Call create-checkout-session with subscription + vehicle
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
          userId: user?.id,
          vehicle: {
            year: Number(vehicleInfo.year),
            make: vehicleInfo.make,
            model: vehicleInfo.model,
            body_type: vehicleInfo.body_type,
            color: vehicleInfo.color,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Checkout session failed");
      }

      const { url } = await response.json();

      // ✅ 3. Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      console.error("Checkout error:", err.message);
      alert("Something went wrong starting checkout.");
    }
  };

  useEffect(() => {
    if (!planId) return;
    const fetchPlan = async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (!error) setPlan(data);
      setLoading(false);
    };
    fetchPlan();
  }, [planId, supabase]);

  if (loading) {
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
    </div>;
  }

  console.log("Billing cycle param:", billingCycle, "Plan:", plan);

  return (
    <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
      {/* Left Column - Form */}
      <div className="space-y-6">
        {/* Enter Your Info */}
        <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-6 text-foreground">
            Enter your vehicle info
          </h2>
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Vehicle Information
            </Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  placeholder="e.g., Toyota"
                  value={vehicleInfo.make}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      make: e.target.value,
                    }))
                  }
                  required
                />
                {errors.make && (
                  <p className="text-red-500 text-sm">{errors.year}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="e.g., Camry"
                  value={vehicleInfo.model}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      model: e.target.value,
                    }))
                  }
                  required
                />
                {errors.model && (
                  <p className="text-red-500 text-sm">{errors.model}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  placeholder="e.g., 2020"
                  value={vehicleInfo.year}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      year: e.target.value,
                    }))
                  }
                  required
                />
                {errors.year && (
                  <p className="text-red-500 text-sm">{errors.year}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  placeholder="e.g., Silver"
                  value={vehicleInfo.color}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      color: e.target.value,
                    }))
                  }
                  required
                />
                {errors.color && (
                  <p className="text-red-500 text-sm">{errors.color}</p>
                )}
              </div>
              {/* <div className="space-y-2">
                <Label htmlFor="trim">Trim</Label>
                <Input
                  id="trim"
                  placeholder="e.g., XLE"
                  value={vehicleInfo.trim}
                  onChange={(e) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      trim: e.target.value,
                    }))
                  }
                  required
                />
                {errors.color && (
                  <p className="text-red-500 text-sm">{errors.color}</p>
                )}
              </div> */}
              <div className="space-y-2">
                <Label>Body Type</Label>
                {plan?.name && (
                  <Select
                    value={vehicleInfo.body_type}
                    onValueChange={handleBodyTypeChange}
                  >
                    <SelectTrigger>
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
        </div>

        {/* How Many Vehicles */}
        {/* <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              How many vehicles
            </h2>
            <a href="#" className="text-sm text-primary hover:underline">
              Multi-Vehicle Benefits
            </a>
          </div>
          <div className="flex gap-3 mb-6">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                // onClick={() => setSelectedVehicles(num)}
                className={`w-12 h-12 rounded-lg font-medium transition-colors `}
              >
                {num}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tx">Texas</SelectItem>
                <SelectItem value="ca">California</SelectItem>
                <SelectItem value="ny">New York</SelectItem>
                <SelectItem value="fl">Florida</SelectItem>
              </SelectContent>
            </Select>
            <Input type="text" placeholder="Vehicle: License Plate" />
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Add your license plate now or later – we'll remind you before your
              first wash. No plate? Use your phone number to access the wash
              anytime.
            </p>
          </div>
        </div> */}
      </div>

      {/* Right Column - Cart Summary */}
      <div className="lg:sticky lg:top-8 h-fit">
        <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
            THE LAUNCH PAD
          </h1>

          {/* Membership Details */}
          <div className="space-y-3 mb-6 pb-6 border-b border-border">
            <Card>
              <CardHeader>
                <CardTitle>Review Your Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{plan?.name}</p>
                <p className="text-gray-600">
                  {billingCycle === "monthly"
                    ? `$${plan?.monthly_price}/month`
                    : `$${plan?.yearly_price}/year`}
                </p>
                {extraFee > 0 && (
                  <p className="text-gray-800 font-semibold">
                    + ${extraFee} / month for selected body type
                  </p>
                )}

                {/* <p className="text-lg mt-2 font-bold">
                  Total: $
                  {billingCycle === "monthly"
                    ? (plan?.monthly_price || 0) + extraFee
                    : (plan?.yearly_price || 0) + extraFee * 12}
                  {billingCycle === "monthly" ? "/month" : "/year"}
                </p> */}
              </CardContent>
            </Card>
          </div>

          {/* Plan Features */}
          <div className="space-y-4 mb-6 pb-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              What's Included
            </h3>
            <div className="space-y-3">
              {Array.isArray(plan?.features) &&
                (plan.features as string[]).map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-foreground" />
                    </div>
                    <p className="font-medium text-foreground">{feature}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Opt-in Checkboxes */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2">
              {/* <Checkbox
                    id="email-updates"
                    checked={emailUpdates}
                    onCheckedChange={(checked) =>
                      setEmailUpdates(checked as boolean)
                    }
                  /> */}
            </div>
          </div>

          {/* Terms */}
          <div className=" flex mb-6">
            <Checkbox className="mr-3" id="authorized" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              I authorized The Launch Pad to automatically charge the selected
              paymenth method{" "}
              {billingCycle === "monthly"
                ? `$${plan?.monthly_price}/month`
                : `$${plan?.yearly_price}/year`}{" "}
              each month on the same date of subscripion until my membership is
              cancelled or terminated.{" "}
              <a href="#" className="text-primary hover:underline">
                Terms of Service Agreement
              </a>
              , including the disclaimer of warranties, limitation of liability,
              and arbitration agreement.
            </p>
          </div>
          <Button className="w-full" onClick={handleCheckout}>
            {loading ? "Redirecting..." : "Checkout"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmationLoading() {
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

export default function SubscriptionCard() {
  return (
    <Suspense fallback={<ConfirmationLoading />}>
      <SubscriptionCartContent />
    </Suspense>
  );
}
