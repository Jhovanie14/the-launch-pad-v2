"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Car, CreditCard } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useVehicleForm } from "@/hooks/useVehicleForm";
import { createClient } from "@/utils/supabase/client";
import TermsModal from "@/components/terms-modal";
import LoadingDots from "@/components/loading";

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
        license_plate: vehicleInfo.license_plate,
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Self-Service Membership
          </h1>
          <p className="text-gray-600 mt-1">
            Complete your subscription to get started
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Plan Details Card */}
          <Card className="border-2 border-blue-200 shadow-lg">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{plan?.name}</h2>
                  <p className="text-blue-100 mt-1">{plan?.description}</p>
                </div>
                <div className="text-right">
                  {/* ============================================
                      PROMO CODE DISCOUNT DISPLAY (COMMENT OUT WHEN PROMO ENDS)
                      ============================================ */}
                  {/* <div className="flex flex-col items-end">
                    <span className="text-lg text-blue-200 line-through">
                      ${plan?.monthly_price}
                    </span>
                    <div className="text-4xl font-bold text-yellow-400">
                      ${((plan?.monthly_price || 0) * 0.8).toFixed(2)}
                    </div>
                    <span className="text-xs bg-yellow-400 text-slate-900 px-2 py-1 rounded-full font-semibold mt-1">
                      Save 20%
                    </span>
                  </div> */}

                  {/* ============================================
                      ORIGINAL PRICE DISPLAY (UNCOMMENT WHEN PROMO ENDS)
                      ============================================ */}
                  <div className="text-4xl font-bold text-yellow-400">
                    ${plan?.monthly_price}
                  </div>
                  {/* ============================================ */}
                  <p className="text-blue-200 text-sm mt-1">per month</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              {plan?.features?.length && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-gray-900 mb-4">
                    What's Included
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {plan.features.map((feature: string, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-gray-700">{feature}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Information Card */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Vehicle License Plate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Label className="text-base">
                  License Plate Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter your license plate (e.g., ABC123)"
                  value={vehicleInfo.license_plate}
                  onChange={(e) =>
                    setVehicleInfo({
                      ...vehicleInfo,
                      license_plate: e.target.value.toUpperCase(),
                    })
                  }
                  className="text-lg font-mono uppercase"
                />
                {errors.license_plate && ( // ✅ Correct - matches the field name
                  <p className="text-red-600 text-sm flex items-center gap-1">
                    <span>⚠</span> {errors.license_plate}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  This will be used to identify your vehicle at our facilities
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Checkout Card */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Complete Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Terms Checkbox */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isAuthorized}
                    onCheckedChange={(checked) => {
                      setIsAuthorized(!!checked);
                      if (checked) setError("");
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      I authorize automatic monthly charges for this membership
                      until cancelled. I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="text-blue-700 underline font-medium hover:text-blue-800"
                      >
                        Terms of Service
                      </button>
                      .
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm flex items-center gap-2">
                    <span>⚠</span> {error}
                  </p>
                </div>
              )}

              {/* Checkout Button */}
              <Button
                className="w-full bg-blue-900 hover:bg-blue-800 text-white py-6 text-lg font-semibold"
                onClick={handleCheckoutClick}
                disabled={loadingCheckout || !plan}
              >
                {loadingCheckout ? (
                  <div className="flex items-center gap-2">
                    <LoadingDots />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span>Subscribe Now - ${plan?.monthly_price}/month</span>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                You can cancel anytime from your account dashboard
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <TermsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
