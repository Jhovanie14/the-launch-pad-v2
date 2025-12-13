// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useSearchParams } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Input } from "@/components/ui/input";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Check, Plus, X } from "lucide-react";
// import { useAuth } from "@/context/auth-context";
// import { useVehicleFlock } from "@/hooks/useVehicleForm";
// import { createClient } from "@/utils/supabase/client";
// import TermsModal from "../terms-modal";
// import LoadingDots from "../loading";

// type Billing = "monthly" | "yearly";

// interface SubscriptionCartProps {
//   // If you want to drive it by URL, pass nothing and it will read from search params.
//   planId?: string | null;
//   billingCycle?: Billing | null;
//   auto?: boolean; // auto-run checkout on mount if true (used after login resume)
//   // Optional hooks to handle unauthenticated flows (open modal or redirect)
//   onRequireAuth?: () => void;
// }

// export default function SubscriptionCart({
//   planId: planIdProp,
//   billingCycle: billingProp,
//   auto = false,
//   onRequireAuth,
// }: SubscriptionCartProps) {
//   const searchParams = useSearchParams();
//   //   const router = useRouter();
//   const supabase = createClient();
//   const { user } = useAuth();
//   //   const { subscription } = useSubscription();

//   const planId = useMemo(
//     () => planIdProp ?? searchParams.get("plan"),
//     [planIdProp, searchParams]
//   );
//   const billingCycle = useMemo(
//     () =>
//       (billingProp ?? (searchParams.get("billing") as Billing)) || "monthly",
//     [billingProp, searchParams]
//   );

//   const [plan, setPlan] = useState<{
//     id: string;
//     name: string;
//     monthly_price: number | string;
//     yearly_price: number | string;
//     features?: string[];
//     stripe_price_id_monthly?: string;
//     stripe_price_id_yearly?: string;
//   } | null>(null);
//   const [loadingPlan, setLoadingPlan] = useState(true);
//   const [loadingCheckout, setLoadingCheckout] = useState(false);
//   const [isAuthorized, setIsAuthorized] = useState(false);
//   const [error, setError] = useState("");
//   const {
//     vehicles,
//     addVehicle,
//     removeVehicle,
//     updateVehicle,
//     errors,
//     validate,
//     canAddMore,
//   } = useVehicleFlock();
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const bodyTypeOptions: Record<string, string[]> = {
//     Sedans: ["Sedan"],
//     Suvs: ["SUV"],
//     "Compact SUV": ["Compact SUV"],
//     "Small Truck": ["Small Pickup Truck"],
//     Van: ["Van"],
//     "Big Trucks": ["Big Pickup Truck"],
//   };

//   useEffect(() => {
//     if (!planId) return;
//     let active = true;
//     setLoadingPlan(true);

//     (async () => {
//       try {
//         const { data, error } = await supabase
//           .from("subscription_plans")
//           .select("*")
//           .eq("id", planId)
//           .single();

//         if (!active) return;
//         if (!error) setPlan(data);
//       } finally {
//         if (active) setLoadingPlan(false);
//       }
//     })();

//     return () => {
//       active = false;
//     };
//   }, [planId, supabase]);

//   //   const basePrice =
//   //     billingCycle === "monthly" ? plan?.monthly_price : plan?.yearly_price;
//   //   const displayPrice = basePrice + extraFee;

//   const basePrice = useMemo(() => {
//     const price =
//       billingCycle === "monthly" ? plan?.monthly_price : plan?.yearly_price;
//     return price ? Number(price) : 0;
//   }, [plan, billingCycle]);

//   // Calculate pricing for each vehicle
//   const vehiclePricing = useMemo(() => {
//     return vehicles.map((_, index) => {
//       const isFirstVehicle = index === 0;
//       const price = isFirstVehicle ? basePrice : basePrice * 0.9; // 10% discount for additional vehicles
//       const discount = isFirstVehicle ? 0 : basePrice * 0.1;
//       return {
//         price,
//         discount,
//         isDiscounted: !isFirstVehicle,
//       };
//     });
//   }, [vehicles, basePrice]);

//   // Calculate total price
//   const totalPrice = useMemo(() => {
//     return vehiclePricing.reduce((sum, item) => sum + item.price, 0);
//   }, [vehiclePricing]);

//   const handleBodyTypeChange = (index: number, val: string) => {
//     updateVehicle(index, { body_type: val });
//   };

//   const startCheckout = async () => {
//     try {
//       setError("");
//       if (!isAuthorized) {
//         setError("You must authorize recurring charges to continue.");
//         return;
//       }
//       // Validate all vehicles
//       if (!validate()) {
//         setError("Please fill in all required vehicle information.");
//         return;
//       }

//       setLoadingCheckout(true);

//       const vehiclesPayload = vehicles.map((vehicle) => ({
//         year: Number(vehicle.year),
//         make: vehicle.make,
//         model: vehicle.model,
//         body_type: vehicle.body_type,
//         color: vehicle.color,
//         licensePlate: vehicle.licensePlate,
//       }));

//       // New subscription with multiple vehicles
//       const res = await fetch("/api/create-checkout-session", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           planId,
//           billingCycle,
//           userId: user?.id,
//           vehicles: vehiclesPayload,
//         }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Checkout session failed");

//       if (data.url) window.location.href = data.url;
//     } catch (err) {
//       console.error("Checkout error:", err);
//       const errorMessage =
//         err instanceof Error ? err.message : "Something went wrong.";
//       setError(errorMessage);
//       setLoadingCheckout(false);
//     }
//   };

//   const handleCheckoutClick = async () => {
//     if (!user) {
//       onRequireAuth?.();
//       return;
//     }
//     await startCheckout();
//   };

//   // Optional auto-run after returning from signup/login
//   useEffect(() => {
//     if (!auto) return;
//     if (!user) return;
//     if (!planId || !billingCycle) return;
//     setIsAuthorized(true);
//     startCheckout();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [auto, user, planId, billingCycle]);

//   return (
//     <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
//       <div className="space-y-6">
//         {vehicles.map((vehicle, index) => (
//           <Card key={index}>
//             <CardHeader>
//               <div className="flex items-center justify-between">
//                 <CardTitle>
//                   Vehicle {index + 1}
//                   {index === 0 && (
//                     <span className="ml-2 text-sm font-normal text-muted-foreground">
//                       (Primary)
//                     </span>
//                   )}
//                   {index > 0 && (
//                     <span className="ml-2 text-sm font-normal text-green-600">
//                       (10% Family Discount)
//                     </span>
//                   )}
//                 </CardTitle>
//                 {vehicles.length > 1 && (
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => removeVehicle(index)}
//                     className="text-red-600 hover:text-red-700"
//                   >
//                     <X className="h-4 w-4" />
//                   </Button>
//                 )}
//               </div>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <Label>Year</Label>
//                   <Input
//                     type="number"
//                     value={vehicle.year ?? ""}
//                     onChange={(e) =>
//                       updateVehicle(index, { year: e.target.value })
//                     }
//                     placeholder="e.g. 2022"
//                   />
//                   {errors[index]?.year && (
//                     <p className="text-red-600 text-sm mt-1">
//                       {errors[index].year}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Make</Label>
//                   <Input
//                     value={vehicle.make}
//                     onChange={(e) =>
//                       updateVehicle(index, { make: e.target.value })
//                     }
//                     placeholder="e.g. Toyota"
//                   />
//                   {errors[index]?.make && (
//                     <p className="text-red-600 text-sm mt-1">
//                       {errors[index].make}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Model</Label>
//                   <Input
//                     value={vehicle.model}
//                     onChange={(e) =>
//                       updateVehicle(index, { model: e.target.value })
//                     }
//                     placeholder="e.g. Camry"
//                   />
//                   {errors[index]?.model && (
//                     <p className="text-red-600 text-sm mt-1">
//                       {errors[index].model}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Color</Label>
//                   <Input
//                     value={vehicle.color}
//                     onChange={(e) =>
//                       updateVehicle(index, { color: e.target.value })
//                     }
//                     placeholder="e.g. White"
//                   />
//                   {errors[index]?.color && (
//                     <p className="text-red-500 text-sm">
//                       {errors[index].color}
//                     </p>
//                   )}
//                 </div>

//                 <div className="space-y-2">
//                   <Label>Body Type</Label>
//                   {plan?.name && (
//                     <Select
//                       value={vehicle.body_type}
//                       onValueChange={(val) => handleBodyTypeChange(index, val)}
//                     >
//                       <SelectTrigger className="w-full">
//                         <SelectValue
//                           placeholder={
//                             plan ? "Select Body Type" : "Loading plan..."
//                           }
//                         />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {bodyTypeOptions[plan.name]?.map((option) => (
//                           <SelectItem key={option} value={option}>
//                             {option}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   )}
//                   {errors[index]?.body_type && (
//                     <p className="text-red-500 text-sm">
//                       {errors[index].body_type}
//                     </p>
//                   )}
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor={`licensePlate-${index}`}>License Plate</Label>
//                   <Input
//                     id={`licensePlate-${index}`}
//                     placeholder="e.g., ABC123 (optional)"
//                     value={vehicle.licensePlate ?? ""}
//                     onChange={(e) =>
//                       updateVehicle(index, { licensePlate: e.target.value })
//                     }
//                   />
//                   {errors[index]?.licensePlate && (
//                     <p className="text-red-500 text-sm">
//                       {errors[index].licensePlate}
//                     </p>
//                   )}
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         ))}

//         {canAddMore && (
//           <>
//             <Label className="text-xl">+ Add Family Vehicles</Label>
//             <Button
//               variant="outline"
//               onClick={addVehicle}
//               className="w-full"
//               disabled={!canAddMore}
//             >
//               <Plus className="h-4 w-4 mr-2" />
//               Add Another Family Vehicle
//             </Button>
//           </>
//         )}

//         {!canAddMore && vehicles.length >= 5 && (
//           <p className="text-sm text-muted-foreground text-center">
//             Maximum of 5 vehicles per subscription
//           </p>
//         )}
//       </div>

//       <div className="space-y-6">
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-lg">Subscription Summary</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="flex items-center justify-between mb-4">
//               <div>
//                 <p className="text-sm text-muted-foreground">Plan</p>
//                 <p className="font-medium">{plan?.name ?? "—"}</p>
//               </div>
//               <div className="text-right">
//                 <p className="text-sm text-muted-foreground capitalize">
//                   {billingCycle}
//                 </p>
//                 <p className="text-sm text-muted-foreground">
//                   Base: ${basePrice?.toFixed(2)}
//                 </p>
//               </div>
//             </div>

//             <div className="space-y-3 mb-6 pb-6 border-b border-border">
//               {/* Vehicle Breakdown */}
//               <div className="space-y-2">
//                 <h4 className="font-semibold text-sm mb-2">Vehicles</h4>
//                 {vehicles.map((vehicle, index) => {
//                   const pricing = vehiclePricing[index];
//                   return (
//                     <div
//                       key={index}
//                       className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0"
//                     >
//                       <div className="flex-1">
//                         <p className="font-medium">
//                           Vehicle {index + 1}
//                           {index === 0 && (
//                             <span className="ml-1 text-xs text-muted-foreground">
//                               (Primary)
//                             </span>
//                           )}
//                         </p>
//                         {vehicle.body_type && (
//                           <p className="text-xs text-muted-foreground">
//                             {vehicle.body_type}
//                           </p>
//                         )}
//                         {pricing.isDiscounted && (
//                           <p className="text-xs text-green-600 mt-1">
//                             Flock Discount: 10% off
//                           </p>
//                         )}
//                       </div>
//                       <div className="text-right">
//                         {pricing.isDiscounted && (
//                           <p className="text-xs text-muted-foreground line-through">
//                             ${basePrice.toFixed(2)}
//                           </p>
//                         )}
//                         <p className="font-semibold">
//                           ${pricing.price.toFixed(2)}
//                           <span className="text-xs text-muted-foreground ml-1">
//                             {billingCycle === "monthly" ? "/mo" : "/yr"}
//                           </span>
//                         </p>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>

//               {/* Total Price */}
//               <div className="flex items-center justify-between pt-3 border-t border-border">
//                 <span className="text-2xl font-bold text-amber-400">
//                   Total Monthly
//                 </span>
//                 <span className="text-2xl font-bold text-amber-400">
//                   ${totalPrice.toFixed(2)}
//                   <span className="text-sm text-muted-foreground ml-1">
//                     {billingCycle === "monthly" ? "/month" : "/year"}
//                   </span>
//                 </span>
//               </div>
//             </div>

//             {/* Billing Cycle Info */}
//             <div className="bg-muted/50 rounded-lg p-4 mb-6">
//               <p className="text-sm text-muted-foreground">
//                 <span className="font-semibold text-foreground">
//                   ${totalPrice.toFixed(2)}
//                 </span>{" "}
//                 will be billed{" "}
//                 <span className="font-semibold">
//                   {billingCycle === "monthly" ? "monthly" : "annually"}
//                 </span>{" "}
//                 on the same date each billing cycle.
//               </p>
//               {vehicles.length > 1 && (
//                 <p className="text-xs text-green-600 mt-2">
//                   ✨ You're saving $
//                   {(basePrice * 0.1 * (vehicles.length - 1)).toFixed(2)}/month
//                   with your flock discount!
//                 </p>
//               )}
//             </div>

//             {plan?.features?.length ? (
//               <div className="space-y-4 mb-6 pb-6 border-b border-border">
//                 <h3 className="text-lg font-semibold text-foreground mb-4">
//                   What's Included
//                 </h3>
//                 <div className="space-y-3">
//                   {plan.features.map((feature, i) => (
//                     <div key={i} className="flex items-start gap-3">
//                       <div className="w-5 h-5 rounded-full bg-green flex items-center justify-center shrink-0 mt-0.5">
//                         <Check className="w-3 h-3 text-green-foreground" />
//                       </div>
//                       <p className="font-medium text-foreground">{feature}</p>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ) : null}

//             <div className="flex mb-6">
//               <Checkbox
//                 className="mr-3 w-5 h-5 border-2 border-black rounded-md"
//                 id="authorized"
//                 checked={isAuthorized}
//                 onCheckedChange={(checked) => {
//                   setIsAuthorized(!!checked);
//                   if (checked) setError("");
//                 }}
//               />
//               <p className="text-xs text-muted-foreground leading-relaxed">
//                 I authorized The Launch Pad to automatically charge the selected
//                 payment method{" "}
//                 <span className="font-semibold">
//                   ${totalPrice.toFixed(2)}
//                   {billingCycle === "monthly" ? "/month" : "/year"}
//                 </span>{" "}
//                 each {billingCycle === "monthly" ? "month" : "year"} on the same
//                 date of subscription until my membership is cancelled or
//                 terminated.{" "}
//                 <button
//                   onClick={() => setIsModalOpen(true)}
//                   className="text-primary hover:underline"
//                 >
//                   Terms of Service Agreement
//                 </button>
//                 , including the disclaimer of warranties, limitation of
//                 liability, and arbitration agreement.
//               </p>
//             </div>

//             {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

//             <Button
//               className="w-full bg-blue-900 hover:bg-blue-700"
//               onClick={handleCheckoutClick}
//               disabled={loadingCheckout || loadingPlan || !planId}
//             >
//               {loadingCheckout ? "Redirecting..." : "Checkout"}
//               {loadingCheckout && <LoadingDots />}
//             </Button>
//           </CardContent>
//         </Card>
//         <TermsModal
//           isOpen={isModalOpen}
//           onClose={() => setIsModalOpen(false)}
//         />
//       </div>
//     </div>
//   );
// }
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
import { Check, Plus, X, Tag } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useVehicleFlock } from "@/hooks/useVehicleForm";
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
  const [allPlans, setAllPlans] = useState<
    Array<{
      id: string;
      name: string;
      monthly_price: number | string;
      yearly_price: number | string;
      stripe_price_id_monthly?: string;
      stripe_price_id_yearly?: string;
    }>
  >([]);
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

  // ============================================
  // PROMO CONFIGURATION (UPDATE THESE SETTINGS)
  // ============================================
  const PROMO_CONFIG = {
    enabled: true, // Set to false when promo ends
    // You need TWO separate Stripe coupons:
    stripeCouponId_SelfService: "JQn39l5R", // 20% off coupon for self-service
    stripeCouponId_Subscription: "TplBWVaw", // 35% off coupon for subscriptions
    isSelfServicePercent: 20, // Self-service discount percentage
    isSubscriptionPercent: 35, // Subscription discount percentage
  };
  // ============================================

  const bodyTypeOptions: Record<string, string[]> = {
    Sedans: ["sedan"],
    Suvs: ["suvs"],
    "Compact SUV": ["compact suv"],
    "Small Truck": ["small truck"],
    Van: ["van"],
    "Mini Van": ["mini van"],
    "Big Trucks": ["big truck"],
  };

  const allBodyTypes = useMemo(() => {
    const types: string[] = [];
    Object.values(bodyTypeOptions).forEach((arr) => arr.forEach((t) => types.push(t)));
    return Array.from(new Set(types));
  }, [bodyTypeOptions]);

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

    // Also fetch all plans so we can show per-vehicle plan info
    (async () => {
      try {
        const { data: plans } = await supabase
          .from("subscription_plans")
          .select("id,name,monthly_price,yearly_price,stripe_price_id_monthly,stripe_price_id_yearly");
        if (plans && active) setAllPlans(plans as any);
      } catch (err) {
        // ignore
      }
    })();

    return () => {
      active = false;
    };
  }, [planId, supabase]);

  // Map body type -> plan (based on bodyTypeOptions)
  const bodyTypeToPlan = useMemo(() => {
    const map: Record<string, typeof allPlans[number] | null> = {};
    allPlans.forEach((p) => {
      const opts = bodyTypeOptions[p.name] || [];
      opts.forEach((opt) => (map[opt] = p));
    });
    return map;
  }, [allPlans]);

  // Detect if this is self-service plan
  const isSelfServicePlan = plan?.name === "Self-Service Bay Membership";

  // Get the appropriate discount percentage for display
  const promoDiscountPercent = PROMO_CONFIG.enabled
    ? isSelfServicePlan
      ? PROMO_CONFIG.isSelfServicePercent
      : PROMO_CONFIG.isSubscriptionPercent
    : 0;

  // Calculate base price (WITHOUT discount - Stripe will handle it)
  const basePrice = useMemo(() => {
    const price =
      billingCycle === "monthly" ? plan?.monthly_price : plan?.yearly_price;
    const originalPrice = price ? Number(price) : 0;

    // Calculate what the price WOULD be with discount (for display only)
    const estimatedDiscount = originalPrice * (promoDiscountPercent / 100);
    const estimatedDiscountedPrice = originalPrice - estimatedDiscount;

    return {
      original: originalPrice,
      estimatedDiscounted: estimatedDiscountedPrice,
      estimatedSavings: estimatedDiscount,
    };
  }, [plan, billingCycle, promoDiscountPercent]);

  // Calculate pricing for each vehicle (using ORIGINAL prices)
  const vehiclePricing = useMemo(() => {
    return vehicles.map((v, index) => {
      const isFirstVehicle = index === 0;
      // Determine plan for this vehicle (fallback to main plan)
      const vehiclePlan = v.body_type ? bodyTypeToPlan[v.body_type] : null;
      const vehicleBase = vehiclePlan
        ? Number(
            billingCycle === "monthly"
              ? vehiclePlan.monthly_price
              : vehiclePlan.yearly_price
          )
        : basePrice.original;

      const price = isFirstVehicle ? vehicleBase : vehicleBase * 0.9;
      const flockDiscount = isFirstVehicle ? 0 : vehicleBase * 0.1;

      const estimatedPrice = price * (1 - promoDiscountPercent / 100);
      const promoSavings = price * (promoDiscountPercent / 100);

      return {
        originalPrice: price,
        estimatedPrice: estimatedPrice,
        promoSavings: promoSavings,
        flockDiscount,
        isDiscounted: !isFirstVehicle,
        vehiclePlan,
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
        // Include planId associated with the selected body type, fallback to selected subscription plan
        planId: vehicle.body_type
          ? bodyTypeToPlan[vehicle.body_type]?.id ?? plan?.id
          : plan?.id,
      }));

      // Select the appropriate coupon based on plan type
      const couponId = PROMO_CONFIG.enabled
        ? isSelfServicePlan
          ? PROMO_CONFIG.stripeCouponId_SelfService
          : PROMO_CONFIG.stripeCouponId_Subscription
        : undefined;

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
          userId: user?.id,
          vehicles: vehiclesPayload,
          // Send the appropriate Stripe coupon ID based on plan type
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
                        {(index === 0 && plan?.name
                          ? bodyTypeOptions[plan.name]
                          : allBodyTypes
                        )?.map((option) => (
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
                    {vehiclePricing[index]?.vehiclePlan && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Plan: {vehiclePricing[index].vehiclePlan.name} • {"$" + (
                          billingCycle === "monthly"
                            ? Number(vehiclePricing[index].vehiclePlan.monthly_price)
                            : Number(vehiclePricing[index].vehiclePlan.yearly_price)
                        ).toFixed(2)}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {billingCycle === "monthly" ? "/mo" : "/yr"}
                        </span>
                      </p>
                    )}
                    {vehiclePricing[index]?.vehiclePlan &&
                      plan &&
                      vehiclePricing[index].vehiclePlan.id !== plan.id && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          Note: This body type maps to the "{vehiclePricing[index].vehiclePlan.name}" plan. Checkout will use the selected plan.
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
              </div>
            </div>

            {/* Promo Code Applied Banner */}
            {PROMO_CONFIG.enabled && promoDiscountPercent > 0 && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4 mb-4">
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
                        {vehicle.body_type && (
                          <p className="text-xs text-muted-foreground">
                            {vehicle.body_type}
                          </p>
                        )}
                        {pricing.vehiclePlan && (
                          <p className="text-xs text-muted-foreground">
                            {pricing.vehiclePlan.name}
                          </p>
                        )}
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
                        {/* Flock */}
                        • Family Discount: ${totalFlockSavings.toFixed(2)}
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
              <p className="text-xs text-muted-foreground leading-relaxed">
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
