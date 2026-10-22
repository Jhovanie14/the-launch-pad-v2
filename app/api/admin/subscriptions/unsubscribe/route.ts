import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import {
  cancelSubscriptionAtPeriodEnd,
  recordAdminSubscriptionAction,
  unsubscribeVehicle,
  type SubscriptionProduct,
} from "@/lib/subscriptions/subscriptionActions";

/**
 * Admin-assisted unsubscribe, for customers who ask staff to do it for them.
 *
 *   { userId, scope: "vehicle", subscriptionVehicleId, reason }
 *     Express only. Family vehicle → removed now with a prorated credit.
 *     Primary → oldest family vehicle promoted, or the whole subscription
 *     cancelled at period end if it was the only vehicle.
 *
 *   { userId, scope: "subscription", product: "express" | "self_service", reason }
 *     Whole subscription cancelled at period end, never refunded.
 *
 * Runs the same actions as the customer's own buttons, so billing, records
 * and customer emails behave identically. `reason` (what the customer asked
 * for, and how) is required and lands in the audit table and on the Stripe
 * subscription.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REASON_LENGTH = 500;

const PRODUCTS: SubscriptionProduct[] = ["express", "self_service"];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const adminUser = await requireAdmin(supabase, admin);

    const body = await req.json().catch(() => null);
    const userId = body?.userId;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (typeof userId !== "string" || !UUID.test(userId)) {
      throw new ApiError("A valid userId is required", 400);
    }
    if (!reason) throw new ApiError("A reason is required", 400);
    if (reason.length > MAX_REASON_LENGTH) {
      throw new ApiError(`Keep the reason under ${MAX_REASON_LENGTH} characters`, 400);
    }

    const actor = { kind: "admin", adminId: adminUser.id, reason } as const;

    if (body.scope === "vehicle") {
      const subscriptionVehicleId = body.subscriptionVehicleId;
      if (typeof subscriptionVehicleId !== "string" || !subscriptionVehicleId) {
        throw new ApiError("subscriptionVehicleId is required", 400);
      }

      const result = await unsubscribeVehicle(admin, userId, subscriptionVehicleId, actor);
      const plate = result.licensePlate ?? "The vehicle";

      if (result.outcome === "already-scheduled") {
        return NextResponse.json({
          success: true,
          outcome: result.outcome,
          message: "This subscription is already set to cancel at the end of the billing period.",
        });
      }

      await recordAdminSubscriptionAction(admin, {
        adminId: adminUser.id,
        userId,
        action:
          result.outcome === "removed"
            ? "remove_vehicle"
            : result.outcome === "promoted"
              ? "promote_and_remove_primary"
              : "cancel_subscription",
        product: "express",
        stripeSubscriptionId: result.stripeSubscriptionId,
        subscriptionVehicleId,
        licensePlate: result.licensePlate,
        reason,
        details: result.newPrimaryPlate ? { new_primary_plate: result.newPrimaryPlate } : {},
      });

      const message =
        result.outcome === "removed"
          ? `${plate} was unsubscribed. The customer gets a prorated credit and an email.`
          : result.outcome === "promoted"
            ? `${plate} was unsubscribed and ${result.newPrimaryPlate ?? "the next vehicle"} is now the primary vehicle. The customer has been emailed.`
            : `${plate} was the only vehicle, so the subscription will cancel at the end of the billing period.`;

      return NextResponse.json({ success: true, outcome: result.outcome, message });
    }

    if (body.scope === "subscription") {
      const product = body.product as SubscriptionProduct;
      if (!PRODUCTS.includes(product)) throw new ApiError("Invalid product", 400);

      const result = await cancelSubscriptionAtPeriodEnd(admin, userId, product, actor);

      if (result.alreadyScheduled) {
        return NextResponse.json({
          success: true,
          outcome: "already-scheduled",
          message: "This subscription is already set to cancel at the end of the billing period.",
        });
      }

      await recordAdminSubscriptionAction(admin, {
        adminId: adminUser.id,
        userId,
        action: "cancel_subscription",
        product,
        stripeSubscriptionId: result.stripeSubscriptionId,
        reason,
      });

      return NextResponse.json({
        success: true,
        outcome: "canceled",
        message:
          "Cancellation scheduled for the end of the billing period. The customer will be emailed.",
      });
    }

    throw new ApiError("Invalid scope", 400);
  } catch (err) {
    return apiError(err);
  }
}
