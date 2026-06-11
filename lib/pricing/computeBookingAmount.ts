import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";

export interface ComputeInput {
  servicePackageId: string;
  addOnIds: string[];
  userId: string | null;
  isAuthenticated: boolean;
  paymentMethod: "card" | "cash" | "subscription";
}

export interface ComputeResult {
  amount: number;
  isFree: boolean;
  servicePrice: number;
  addOnsTotal: number;
}

/** Does the subscription plan name cover this service category for free? */
function planCoversCategory(planName: string, category: string): boolean {
  const name = planName.toLowerCase();
  const cat = category.toLowerCase();
  if (cat === "quick service")
    return name.includes("quick") || name.includes("exterior");
  if (cat === "express detail")
    return name.includes("express") || name.includes("commercial");
  return false;
}

/**
 * Recompute the authoritative booking amount from the database.
 * The client's prices are never trusted. Throws ApiError(400) on rule violations.
 */
export async function computeBookingAmount(
  db: SupabaseClient,
  input: ComputeInput
): Promise<ComputeResult> {
  if (input.paymentMethod === "cash" && !input.isAuthenticated) {
    throw new ApiError("Cash payment requires an account", 400);
  }

  const { data: service } = await db
    .from("service_packages")
    .select("id, price, category")
    .eq("id", input.servicePackageId)
    .maybeSingle();

  if (!service) throw new ApiError("Invalid service package", 400);

  let addOnsTotal = 0;
  if (input.addOnIds.length > 0) {
    const { data: addOns } = await db
      .from("add_ons")
      .select("id, price")
      .in("id", input.addOnIds);
    addOnsTotal = (addOns ?? []).reduce(
      (sum: number, a: any) => sum + Number(a.price),
      0
    );
  }

  let isFree = false;
  if (input.isAuthenticated && input.userId) {
    const { data: sub } = await db
      .from("user_subscription")
      .select("id, subscription_plan_id, status")
      .eq("user_id", input.userId)
      .eq("status", "active")
      .maybeSingle();

    if (sub) {
      const { data: plan } = await db
        .from("subscription_plans")
        .select("id, name")
        .eq("id", sub.subscription_plan_id)
        .maybeSingle();
      if (plan && planCoversCategory(plan.name, service.category ?? "")) {
        isFree = true;
      }
    }
  }

  const servicePrice = isFree ? 0 : Number(service.price);
  return {
    amount: servicePrice + addOnsTotal,
    isFree,
    servicePrice,
    addOnsTotal,
  };
}
