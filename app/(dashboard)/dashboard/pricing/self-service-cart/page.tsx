"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useVehicleForm } from "@/hooks/useVehicleForm";
import { createClient } from "@/utils/supabase/client";
import TermsModal from "@/components/terms-modal";
import LoadingDots from "@/components/loading";
import { motion } from "framer-motion";

export default function SelfServiceCart() {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();

  const [plan, setPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { vehicleInfo, setVehicleInfo, errors, validate } = useVehicleForm();

  const bodyTypeOptions = [
    "Sedan",
    "SUV",
    "Big Pickup Truck",
    "Van",
    "Compact SUV",
  ];

  // Fetch active self-service plan
  useEffect(() => {
    let active = true;
    setLoadingPlan(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("self_service_plans")
          .select("*")
          .eq("is_active", true)
          .maybeSingle();

        if (!active) return;
        if (!error && data) setPlan(data);
      } finally {
        if (active) setLoadingPlan(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  const handleBodyTypeChange = (val: string) => {
    setVehicleInfo({ ...vehicleInfo, body_type: val });
  };

  const startCheckout = async () => {
    try {
      setError("");
      if (!isAuthorized) {
        setError("You must authorize recurring charges to continue.");
        return;
      }
      if (!validate()) return;

      setLoadingCheckout(true);

      const vehiclePayload = {
        year: Number(vehicleInfo.year),
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        body_type: vehicleInfo.body_type,
        color: vehicleInfo.color,
      };

      const res = await fetch("/api/create-selfservice-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan?.id,
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
      router.push("/login");
      return;
    }
    await startCheckout();
  };

  if (loadingPlan) return <LoadingDots />;

  return (
    <div className="space-y-8">
      {/* Promo Banner */}
      {/* <motion.div
        className="bg-linear-to-r from-red-500 to-red-600 text-white text-center py-4 px-4 rounded-lg shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl md:text-3xl font-bold">
            Get 20% Off When You Apply Promo Code LAUNCHPAD20 at Checkout
          </span>
        </div>
      </motion.div> */}
      <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
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
                    setVehicleInfo({ ...vehicleInfo, year: e.target.value })
                  }
                  placeholder="e.g. 2022"
                />
                {errors.year && (
                  <p className="text-red-600 text-sm">{errors.year}</p>
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
                  <p className="text-red-600 text-sm">{errors.make}</p>
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
                  <p className="text-red-600 text-sm">{errors.model}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={vehicleInfo.color}
                  onChange={(e) =>
                    setVehicleInfo({ ...vehicleInfo, color: e.target.value })
                  }
                  placeholder="e.g. White"
                />
                {errors.color && (
                  <p className="text-red-600 text-sm">{errors.color}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Body Type</Label>
                <Select
                  value={vehicleInfo.body_type}
                  onValueChange={handleBodyTypeChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Body Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodyTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.body_type && (
                  <p className="text-red-600 text-sm">{errors.body_type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>License Plate</Label>
                <Input
                  placeholder="e.g., ABC123 (optional)"
                  value={vehicleInfo.licensePlate}
                  onChange={(e) =>
                    setVehicleInfo({
                      ...vehicleInfo,
                      licensePlate: e.target.value,
                    })
                  }
                />
                {errors.licensePlate && (
                  <p className="text-red-600 text-sm">{errors.licensePlate}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{plan?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{plan?.description}</p>
            {/* ============================================
              PROMO CODE DISCOUNT DISPLAY (COMMENT OUT WHEN PROMO ENDS)
              ============================================ */}
            {/* <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg text-slate-500 line-through">
                ${plan?.monthly_price}/month
              </span>
              <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">
                Save 20%
              </span>
            </div>
            <p className="text-2xl font-semibold">
              ${((plan?.monthly_price || 0) * 0.8).toFixed(2)}/month
            </p>
          </div> */}

            {/* ============================================
              ORIGINAL PRICE DISPLAY (UNCOMMENT WHEN PROMO ENDS)
              ============================================ */}
            <p className="text-2xl font-semibold">
              ${plan?.monthly_price}/month
            </p>
            {/* ============================================ */}

            {plan?.features?.length && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">What's Included</h3>
                {plan.features.map((feature: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <p>{feature}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-3 mt-4">
              <Checkbox
                checked={isAuthorized}
                onCheckedChange={(checked) => {
                  setIsAuthorized(!!checked);
                  if (checked) setError("");
                }}
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                I authorize automatic monthly charges for this membership until
                cancelled.
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-blue-700 underline ml-1"
                >
                  Terms of Service
                </button>
              </p>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <Button
              className="w-full bg-blue-900 hover:bg-blue-700"
              onClick={handleCheckoutClick}
              disabled={loadingCheckout || !plan}
            >
              {loadingCheckout ? "Redirecting..." : "Subscribe"}
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
