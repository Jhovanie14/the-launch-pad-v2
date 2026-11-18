import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";
import { applyHolidaySale } from "@/lib/booking/holidaySale";

export interface ComputeInput {
  servicePackageId: string;
  addOnIds: string[];
  userId: string | null;
  isAuthenticated: boolean;
  paymentMethod: "card" | "cash" | "subscription";
  /**
   * The car being washed. When given, a member's free wash only applies if
   * this car is on their plan (by plate, ignoring spaces and dashes, or by
   * vehicle id). Every CUSTOMER path must pass it; leaving it out keeps the
   * older account-wide rule, which only staff paths still rely on.
   */
  vehicle?: { plate?: string | null; vehicleId?: string | null };
  /** Customer bookings: refuse a service or add-on that is no longer offered. */
  requireActive?: boolean;
}

/** Plate compared with case, spaces and dashes ignored. */
function plateKey(plate: string | null | undefined): string {
  return (plate ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Is this car on the subscription? */
async function vehicleOnSubscription(
  db: SupabaseClient,
  subscriptionId: string,
  vehicle: { plate?: string | null; vehicleId?: string | null }
): Promise<boolean> {
  const wantPlate = plateKey(vehicle.plate);
  const wantId = vehicle.vehicleId ?? "";
  if (!wantPlate && !wantId) return false;
  const { data } = await db
    .from("subscription_vehicles")
    .select("vehicle_id, vehicles(license_plate)")
    .eq("subscription_id", subscriptionId);
  return (data ?? []).some((row: any) => {
    const plate = Array.isArray(row.vehicles) ? row.vehicles[0]?.license_plate : row.vehicles?.license_plate;
    return (wantId && row.vehicle_id === wantId) || (wantPlate && plateKey(plate) === wantPlate);
  });
}

export interface ComputeResult {
  amount: number;
  isFree: boolean;
  servicePrice: number;
  addOnsTotal: number;
  /** From the database, never from the browser. */
  serviceName: string | null;
  /** Service + add-on minutes, from the database. */
  totalDuration: number;
  /** The requested add-ons that exist (and are offered, with requireActive), without repeats. */
  addOnIds: string[];
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
    .select("id, name, price, category, duration, is_active")
    .eq("id", input.servicePackageId)
    .maybeSingle();

  if (!service) throw new ApiError("Invalid service package", 400);
  if (input.requireActive && service.is_active === false) {
    throw new ApiError("That service is no longer offered. Please choose another.", 400);
  }

  let addOnsTotal = 0;
  let addOnMinutes = 0;
  let addOnIds: string[] = [];
  const requested = [...new Set(input.addOnIds.filter(Boolean))];
  if (requested.length > 0) {
    const { data: addOns } = await db
      .from("add_ons")
      .select("id, price, duration, is_active")
      .in("id", requested);
    const usable = (addOns ?? []).filter(
      (a: any) => !(input.requireActive && a.is_active === false)
    );
    if (input.requireActive && usable.length !== requested.length) {
      throw new ApiError("One of those add-ons is no longer offered. Please review your selection.", 400);
    }
    addOnIds = usable.map((a: any) => a.id);
    addOnsTotal = usable.reduce((sum: number, a: any) => sum + Number(a.price), 0);
    addOnMinutes = usable.reduce((sum: number, a: any) => sum + (Number(a.duration) || 0), 0);
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
        isFree = input.vehicle
          ? await vehicleOnSubscription(db, sub.id, input.vehicle)
          : true;
      }
    }
  }

  // Holiday sale applies to the non-free service and to add-ons; promo codes
  // are applied later (validatePromo) on top of the discounted amount, in the
  // same order the display lib previews it.
  const servicePrice = round2(isFree ? 0 : applyHolidaySale(Number(service.price)));
  const discountedAddOnsTotal = round2(applyHolidaySale(addOnsTotal));
  return {
    amount: round2(servicePrice + discountedAddOnsTotal),
    isFree,
    servicePrice,
    addOnsTotal: discountedAddOnsTotal,
    serviceName: service.name ?? null,
    totalDuration: (Number(service.duration) || 0) + addOnMinutes,
    addOnIds,
  };
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}
