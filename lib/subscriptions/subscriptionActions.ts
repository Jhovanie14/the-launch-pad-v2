import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe/stripe";
import { ApiError } from "@/lib/http/apiError";
import { ensureVehicle } from "@/utils/vehicle";
import {
  sendFamilyVehicleAddedEmail,
  sendFamilyVehicleRemovedEmail,
  sendPrimaryVehicleSwappedEmail,
} from "@/lib/email/subscription-emails";
import {
  MAX_VEHICLES_PER_SUBSCRIPTION,
  findReusableFlockPrice,
  flockDiscountPercent,
  flockPriceMetadata,
  flockUnitAmountCents,
  subscriptionTotal,
} from "@/lib/pricing/flockPricing";
import {
  cancelAtPeriodEndParams,
  isStripeResourceMissing,
  planVehicleUnsubscribe,
  resolveFamilyItemId,
  type SubscriptionActor,
  type SubscriptionVehicleRow,
} from "./vehicleUnsubscribe";
import {
  VEHICLE_CHANGE_COOLDOWN_MONTHS,
  addMonths,
  vehicleChangeLock,
  type VehicleChangeEvent,
  type VehicleChangeKind,
  type VehicleChangeLock,
} from "./vehicleChangeLimit";

/**
 * Subscription changes shared by the customer routes and the admin route.
 *
 * Every action takes the customer's `userId` explicitly and runs on the
 * service-role client; none of them read the session. The calling route is
 * responsible for deciding whose subscription it is — `requireUser` for the
 * customer routes, `requireAdmin` for the admin route. Everything below is
 * scoped to that user's own active subscription, so an id from another
 * account resolves to "not found".
 *
 * Order is always Stripe first, then the DB: if Stripe refuses, nothing in
 * our records changes and the customer is still billed exactly as shown.
 */

export type SubscriptionProduct = "express" | "self_service";

interface ExpressSubscription {
  id: string;
  stripe_subscription_id: string;
  subscription_plan_id: string | null;
  billing_cycle: string | null;
}

type ExpressVehicle = SubscriptionVehicleRow & {
  vehicles: { license_plate: string | null } | null;
};

interface ExpressContext {
  sub: ExpressSubscription;
  /** Primary first, then oldest first. */
  vehicles: ExpressVehicle[];
}

const LOG = "[subscription-actions]";

// ---------------------------------------------------------------- loading

async function loadActiveExpress(db: SupabaseClient, userId: string): Promise<ExpressContext> {
  const { data: sub } = await db
    .from("user_subscription")
    .select("id, stripe_subscription_id, subscription_plan_id, billing_cycle")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!sub) throw new ApiError("No active subscription found", 400);

  const { data: vehicles } = await db
    .from("subscription_vehicles")
    .select("id, vehicle_id, stripe_item_id, is_primary, vehicles(license_plate)")
    .eq("subscription_id", sub.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (!vehicles || vehicles.length === 0) {
    throw new ApiError("No vehicles found on this subscription", 404);
  }

  return { sub, vehicles: vehicles as unknown as ExpressVehicle[] };
}

function plateOf(v: ExpressVehicle): string | null {
  return v.vehicles?.license_plate ?? null;
}

async function customerContact(db: SupabaseClient, userId: string) {
  const [{ data: authData }, { data: profile }] = await Promise.all([
    db.auth.admin.getUserById(userId),
    db.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  return { email: authData?.user?.email ?? null, name: profile?.full_name ?? "there" };
}

/** Price of the subscription once it carries `vehicleCount` vehicles. */
async function totalForVehicleCount(
  db: SupabaseClient,
  sub: ExpressSubscription,
  vehicleCount: number,
): Promise<number | null> {
  const { data: plan } = await db
    .from("subscription_plans")
    .select("name, is_commercial, monthly_price, yearly_price")
    .eq("id", sub.subscription_plan_id)
    .maybeSingle();
  if (!plan) return null;

  const basePrice =
    sub.billing_cycle === "year" ? Number(plan.yearly_price ?? 0) : Number(plan.monthly_price ?? 0);
  return subscriptionTotal(basePrice, vehicleCount, plan);
}

/** Emails are a courtesy once billing has changed — never fail the request over one. */
async function sendSafely(label: string, send: () => Promise<unknown>) {
  try {
    await send();
  } catch (err) {
    console.error(`${LOG} ${label} email failed:`, err);
  }
}

const RECORDS_OUT_OF_SYNC =
  "Billing was updated but our records could not be. Please contact support.";

// ---------------------------------------------------------------- vehicle change limit

/**
 * Append to the vehicle-change history. After a billing change a failed write
 * is only logged — the change already happened. Returns whether it saved, for
 * callers where the write is the whole point (a staff unlock).
 */
export async function recordVehicleChange(
  db: SupabaseClient,
  userId: string,
  kind: VehicleChangeKind,
  actor: SubscriptionActor,
  licensePlate: string | null,
  note?: string,
): Promise<boolean> {
  const { error } = await db.from("subscription_vehicle_changes").insert({
    user_id: userId,
    kind,
    license_plate: licensePlate,
    actor: actor.kind,
    admin_id: actor.kind === "admin" ? actor.adminId : null,
    note: note ?? (actor.kind === "admin" ? actor.reason : null),
  });
  if (error) {
    console.error(`${LOG} vehicle change history write failed:`, { userId, kind, licensePlate }, error);
  }
  return !error;
}

/** Whether this customer may add a vehicle right now (see vehicleChangeLimit.ts). */
export async function loadVehicleChangeLock(db: SupabaseClient, userId: string): Promise<VehicleChangeLock> {
  const { data, error } = await db
    .from("subscription_vehicle_changes")
    .select("kind, created_at")
    .eq("user_id", userId)
    .gte("created_at", addMonths(new Date(), -VEHICLE_CHANGE_COOLDOWN_MONTHS).toISOString());

  if (error) {
    // Fail open: a missing history table must not stop customers adding cars.
    console.error(`${LOG} could not read vehicle change history:`, error);
    return { locked: false };
  }
  return vehicleChangeLock((data ?? []) as VehicleChangeEvent[]);
}

// ---------------------------------------------------------------- steps

async function removeFamily(
  db: SupabaseClient,
  userId: string,
  ctx: ExpressContext,
  target: ExpressVehicle,
  actor: SubscriptionActor,
) {
  const index = ctx.vehicles.findIndex((v) => v.id === target.id);

  // Only hit Stripe for the item list when the row predates stripe_item_id.
  const items = target.stripe_item_id
    ? []
    : (await stripe.subscriptions.retrieve(ctx.sub.stripe_subscription_id)).items.data;
  const { id: stripeItemId, via } = resolveFamilyItemId(ctx.vehicles, index, items);

  if (stripeItemId) {
    try {
      await stripe.subscriptionItems.del(stripeItemId, { proration_behavior: "create_prorations" });
      console.log(`${LOG} stripe item deleted:`, stripeItemId, "via", via);
    } catch (err) {
      // Only "already gone" is safe to step past. Anything else means the
      // customer is still being billed, so the vehicle must stay on record.
      if (!isStripeResourceMissing(err)) {
        console.error(`${LOG} stripe item delete failed:`, stripeItemId, err);
        throw new ApiError(
          "Stripe could not remove this vehicle from billing, so nothing was changed. Please try again.",
          502,
        );
      }
      console.warn(`${LOG} stripe item already gone, cleaning up records:`, stripeItemId);
    }
  } else {
    console.warn(`${LOG} no stripe item found for subscription_vehicle — skipping Stripe delete:`, target.id);
  }

  const { error } = await db.from("subscription_vehicles").delete().eq("id", target.id);
  if (error) {
    console.error(`${LOG} db delete error:`, error.message);
    throw new ApiError(RECORDS_OUT_OF_SYNC, 500);
  }
  await recordVehicleChange(db, userId, "removed", actor, plateOf(target));

  const [contact, newTotal] = await Promise.all([
    customerContact(db, userId),
    totalForVehicleCount(db, ctx.sub, ctx.vehicles.length - 1),
  ]);
  if (contact.email && newTotal !== null) {
    await sendSafely("family-vehicle-removed", () =>
      sendFamilyVehicleRemovedEmail({
        to: contact.email!,
        name: contact.name,
        licensePlate: plateOf(target) ?? "your vehicle",
        newTotal,
        billingCycle: ctx.sub.billing_cycle ?? "month",
      }),
    );
  }
}

async function resolveFullPriceId(db: SupabaseClient, sub: ExpressSubscription): Promise<string> {
  const { data: plan } = await db
    .from("subscription_plans")
    .select("stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("id", sub.subscription_plan_id)
    .maybeSingle();

  const planPriceId =
    sub.billing_cycle === "month" ? plan?.stripe_price_id_monthly : plan?.stripe_price_id_yearly;

  if (planPriceId?.startsWith("price_")) return planPriceId;
  if (planPriceId?.startsWith("prod_")) {
    const prices = await stripe.prices.list({
      product: planPriceId,
      active: true,
      recurring: { interval: sub.billing_cycle === "month" ? "month" : "year" },
      limit: 1,
    });
    if (prices.data[0]) return prices.data[0].id;
  }
  throw new ApiError("Could not resolve full-price Stripe price for this plan", 500);
}

/** Promote `target` to primary at the full plan price and drop `oldPrimary`. */
async function promote(
  db: SupabaseClient,
  userId: string,
  ctx: ExpressContext,
  oldPrimary: ExpressVehicle,
  target: ExpressVehicle,
  actor: SubscriptionActor,
) {
  const fullPriceId = await resolveFullPriceId(db, ctx.sub);

  // The live subscription also tells us whether the old primary's item still exists.
  const stripeSub = await stripe.subscriptions.retrieve(ctx.sub.stripe_subscription_id);
  const items = stripeSub.items.data;
  const liveItemIds = new Set(items.map((item) => item.id));

  const oldPrimaryItemId =
    oldPrimary.stripe_item_id ??
    items.find((item) => item.price?.metadata?.vehicle_index === "0")?.id ??
    items[0]?.id ??
    null;

  const targetIndex = ctx.vehicles.findIndex((v) => v.id === target.id);
  const targetItemId = resolveFamilyItemId(ctx.vehicles, targetIndex, items).id;
  if (!targetItemId) {
    throw new ApiError("Could not resolve the chosen vehicle's Stripe billing item", 500);
  }

  // Promote the target to the full base price and remove the old primary in a
  // single update. The old primary is usually on that same full price, and
  // Stripe rejects two items sharing a price — so promoting first, then
  // deleting, failed there. One update is checked against the end state.
  const deleteOldPrimary =
    !!oldPrimaryItemId && oldPrimaryItemId !== targetItemId && liveItemIds.has(oldPrimaryItemId);

  if (!deleteOldPrimary) {
    console.warn(`${LOG} old primary stripe item not on subscription — skipping Stripe delete:`, oldPrimaryItemId);
  }

  await stripe.subscriptions.update(ctx.sub.stripe_subscription_id, {
    items: [
      { id: targetItemId, price: fullPriceId },
      ...(deleteOldPrimary ? [{ id: oldPrimaryItemId!, deleted: true }] : []),
    ],
    proration_behavior: "create_prorations",
  });

  // DB: remove old primary row first — a unique index allows one primary per subscription.
  const { error: deleteError } = await db.from("subscription_vehicles").delete().eq("id", oldPrimary.id);
  if (deleteError) {
    console.error(`${LOG} db delete error:`, deleteError.message);
    throw new ApiError(RECORDS_OUT_OF_SYNC, 500);
  }

  const { error: updateError } = await db
    .from("subscription_vehicles")
    .update({ is_primary: true })
    .eq("id", target.id);
  if (updateError) {
    console.error(`${LOG} db update error:`, updateError.message);
    throw new ApiError(RECORDS_OUT_OF_SYNC, 500);
  }
  await recordVehicleChange(db, userId, "removed", actor, plateOf(oldPrimary));

  // The old primary leaves the subscription; the promoted target takes its
  // place, so the vehicle count drops by one and the plan's own flock rate
  // (full price on commercial plans) prices whatever remains.
  const [contact, newTotal] = await Promise.all([
    customerContact(db, userId),
    totalForVehicleCount(db, ctx.sub, ctx.vehicles.length - 1),
  ]);
  if (contact.email && newTotal !== null) {
    await sendSafely("primary-vehicle-swapped", () =>
      sendPrimaryVehicleSwappedEmail({
        to: contact.email!,
        name: contact.name,
        oldPrimaryLabel: plateOf(oldPrimary) ?? "your old primary vehicle",
        newPrimaryLabel: plateOf(target) ?? "your new primary vehicle",
        newTotal,
        billingCycle: ctx.sub.billing_cycle ?? "month",
      }),
    );
  }
}

// ---------------------------------------------------------------- actions

const MAX_PLATE_LENGTH = 20;

/**
 * Add a vehicle to the customer's express subscription at the plan's flock
 * rate (full price on commercial plans), prorated for the current period.
 *
 * Customers are held to one vehicle change per 6 months. Staff adding on a
 * customer's behalf — in the shop, or after checking a request — override it;
 * the add is still recorded, so it counts as the customer's change.
 */
export async function addSubscriptionVehicle(
  db: SupabaseClient,
  userId: string,
  licensePlate: string,
  actor: SubscriptionActor,
): Promise<{ vehicleId: string; licensePlate: string; stripeSubscriptionId: string }> {
  const plate = licensePlate.trim().toUpperCase();
  if (!plate) throw new ApiError("License plate is required", 400);
  if (plate.length > MAX_PLATE_LENGTH) throw new ApiError("That license plate looks too long", 400);

  const { data: sub } = await db
    .from("user_subscription")
    .select("id, stripe_subscription_id, subscription_plan_id, billing_cycle, subscription_vehicles(id)")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!sub) throw new ApiError("No active subscription found", 400);

  const currentVehicleCount = (sub.subscription_vehicles as unknown[] | null)?.length ?? 0;
  if (currentVehicleCount >= MAX_VEHICLES_PER_SUBSCRIPTION) {
    throw new ApiError(`Maximum ${MAX_VEHICLES_PER_SUBSCRIPTION} vehicles allowed per subscription`, 400);
  }

  // Checked before anything touches Stripe.
  if (actor.kind === "customer") {
    const lock = await loadVehicleChangeLock(db, userId);
    if (lock.locked) {
      const unlocks = lock.unlocksAt.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      throw new ApiError(
        `You've already changed a vehicle in the last ${VEHICLE_CHANGE_COOLDOWN_MONTHS} months. You can add a vehicle again on ${unlocks}. Sold or upgraded your car? Submit a request or visit us in the shop and we'll sort it out.`,
        403,
      );
    }
  }

  // One car, one active subscription. Matched by plate across every vehicle
  // row (older data can hold more than one row per plate), so a car can't be
  // covered by two memberships. A genuine sale is moved over by staff:
  // unsubscribe it from the old account, then add it here.
  const { data: activeLinks, error: linksError } = await db
    .from("subscription_vehicles")
    .select("subscription_id, vehicles!inner(license_plate), user_subscription!inner(status)")
    .eq("vehicles.license_plate", plate)
    .eq("user_subscription.status", "active");
  if (linksError) {
    console.error(`${LOG} duplicate plate check failed:`, linksError);
    throw new ApiError("Could not check this license plate. Please try again.", 500);
  }
  if (activeLinks?.some((link) => link.subscription_id === sub.id)) {
    throw new ApiError("This vehicle is already on this subscription", 400);
  }
  if (activeLinks && activeLinks.length > 0) {
    throw new ApiError(
      "This vehicle is already on another active membership. If you've bought this car, submit a request or visit us in the shop and we'll move it over.",
      409,
    );
  }

  let stripeSub: Awaited<ReturnType<typeof stripe.subscriptions.retrieve>>;
  try {
    stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  } catch (err: any) {
    console.error(`${LOG} stripe retrieve error:`, err?.message);
    // Test/live mode mismatch — subscription exists in the other Stripe mode
    if (
      err?.message?.includes("a similar object exists in test mode") ||
      err?.message?.includes("a similar object exists in live mode")
    ) {
      throw new ApiError(
        "Your subscription was created in Stripe test mode but the app is running in live mode (or vice versa). Please contact support to re-link your subscription.",
        400,
      );
    }
    throw new ApiError("Could not retrieve subscription from Stripe. Please try again or contact support.", 500);
  }

  const primaryItem = stripeSub.items.data[0];
  if (!primaryItem) throw new ApiError("Could not find subscription details in Stripe", 500);

  // Stripe may return the product as a string or an expanded object
  const productId =
    typeof primaryItem.price.product === "string" ? primaryItem.price.product : primaryItem.price.product.id;

  // The primary item's price may be discounted (promo), so read the plan's
  // canonical price. billing_cycle is constrained to 'month' | 'year'.
  let originalBaseAmount = primaryItem.price.unit_amount ?? 0;
  const { data: plan } = await db
    .from("subscription_plans")
    .select("name, is_commercial, stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("id", sub.subscription_plan_id)
    .maybeSingle();

  if (plan) {
    const planPriceId = sub.billing_cycle === "month" ? plan.stripe_price_id_monthly : plan.stripe_price_id_yearly;
    if (planPriceId?.startsWith("price_")) {
      const originalPrice = await stripe.prices.retrieve(planPriceId);
      originalBaseAmount = originalPrice.unit_amount ?? originalBaseAmount;
    } else if (planPriceId?.startsWith("prod_")) {
      // Some plans store a product ID instead of a price ID — look up the active price
      const prices = await stripe.prices.list({
        product: planPriceId,
        active: true,
        recurring: { interval: sub.billing_cycle === "month" ? "month" : "year" },
        limit: 1,
      });
      originalBaseAmount = prices.data[0]?.unit_amount ?? originalBaseAmount;
    }
  }

  // Commercial plans get no family discount — lib/pricing/flockPricing owns that rule.
  const targetAmount = flockUnitAmountCents(originalBaseAmount, plan);
  const discountPercent = flockDiscountPercent(plan);

  // Reuse an existing additional-vehicle price for this product/interval/amount,
  // skipping any price this subscription already holds — Stripe rejects a
  // second item on the same price.
  const existingPrices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const existingPrice = findReusableFlockPrice(
    existingPrices.data,
    {
      unitAmount: targetAmount,
      interval: primaryItem.price.recurring!.interval,
      intervalCount: primaryItem.price.recurring!.interval_count,
    },
    stripeSub.items.data.map((item) => item.price.id),
  );

  const additionalVehiclePrice =
    existingPrice ??
    (await stripe.prices.create({
      currency: primaryItem.price.currency,
      unit_amount: targetAmount,
      recurring: {
        interval: primaryItem.price.recurring!.interval,
        interval_count: primaryItem.price.recurring!.interval_count ?? 1,
      },
      product: productId,
      metadata: flockPriceMetadata(sub.subscription_plan_id, plan),
    }));

  // Add the new item to the existing Stripe subscription (prorated automatically)
  const newStripeItem = await stripe.subscriptionItems.create({
    subscription: sub.stripe_subscription_id,
    price: additionalVehiclePrice.id,
    proration_behavior: "create_prorations",
  });
  console.log(`${LOG} created stripe item:`, newStripeItem.id, "price:", additionalVehiclePrice.id);

  // From here on, any failure must take the Stripe item back off, or the
  // customer is billed for a vehicle we have no record of.
  const rollback = async (message: string, cause: unknown) => {
    console.error(`${LOG} add-vehicle failed after Stripe item created, rolling back:`, cause);
    try {
      await stripe.subscriptionItems.del(newStripeItem.id, { proration_behavior: "none" });
    } catch (err) {
      console.error(`${LOG} ROLLBACK FAILED — remove stripe item manually:`, newStripeItem.id, err);
    }
    return new ApiError(message, 500);
  };

  let vehicleId: string | null;
  try {
    vehicleId = await ensureVehicle({ license_plate: plate, user_id: userId });
  } catch (err) {
    throw await rollback("Failed to create vehicle record", err);
  }
  if (!vehicleId) throw await rollback("Failed to create vehicle record", "ensureVehicle returned null");

  const { error: linkError } = await db.from("subscription_vehicles").insert({
    subscription_id: sub.id,
    vehicle_id: vehicleId,
    stripe_item_id: newStripeItem.id,
  });
  if (linkError) throw await rollback("Failed to link vehicle to subscription", linkError);

  await recordVehicleChange(db, userId, "added", actor, plate);

  const contact = await customerContact(db, userId);
  if (contact.email) {
    await sendSafely("family-vehicle-added", () =>
      sendFamilyVehicleAddedEmail({
        to: contact.email!,
        name: contact.name,
        licensePlate: plate,
        newTotal: (originalBaseAmount + targetAmount * currentVehicleCount) / 100,
        billingCycle: sub.billing_cycle ?? "month",
        discountPercent,
      }),
    );
  }

  return { vehicleId, licensePlate: plate, stripeSubscriptionId: sub.stripe_subscription_id };
}

/** Customer "Unsubscribe this vehicle" — family vehicles only. */
export async function removeFamilyVehicle(
  db: SupabaseClient,
  userId: string,
  subscriptionVehicleId: string,
  actor: SubscriptionActor,
) {
  const ctx = await loadActiveExpress(db, userId);
  const target = ctx.vehicles.find((v) => v.id === subscriptionVehicleId);
  if (!target) throw new ApiError("Vehicle not found on this subscription", 404);
  if (target.is_primary) {
    throw new ApiError(
      "Cannot remove the primary vehicle here. Use the primary-vehicle unsubscribe control instead.",
      400,
    );
  }
  await removeFamily(db, userId, ctx, target, actor);
}

/** Customer "Unsubscribe primary" — the customer picks the family vehicle to promote. */
export async function swapPrimaryVehicle(
  db: SupabaseClient,
  userId: string,
  newPrimarySubscriptionVehicleId: string,
  actor: SubscriptionActor,
) {
  const ctx = await loadActiveExpress(db, userId);
  const oldPrimary = ctx.vehicles.find((v) => v.is_primary);
  const target = ctx.vehicles.find((v) => v.id === newPrimarySubscriptionVehicleId);

  if (!oldPrimary) throw new ApiError("No primary vehicle found on this subscription", 404);
  if (!target) throw new ApiError("Chosen vehicle not found on this subscription", 404);
  if (target.is_primary) throw new ApiError("Chosen vehicle is already the primary vehicle", 400);

  await promote(db, userId, ctx, oldPrimary, target, actor);
}

const SUBSCRIPTION_TABLE: Record<SubscriptionProduct, string> = {
  express: "user_subscription",
  self_service: "self_service_subscriptions",
};

/** Schedule the whole subscription to end at period end — never immediate, never refunded. */
export async function cancelSubscriptionAtPeriodEnd(
  db: SupabaseClient,
  userId: string,
  product: SubscriptionProduct,
  actor: SubscriptionActor,
): Promise<{ alreadyScheduled: boolean; stripeSubscriptionId: string }> {
  const table = SUBSCRIPTION_TABLE[product];
  const { data: sub } = await db
    .from(table)
    .select("id, stripe_subscription_id, cancel_at_period_end")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!sub) {
    throw new ApiError(
      product === "express" ? "No active subscription" : "No active self-service subscription",
      404,
    );
  }
  if (!sub.stripe_subscription_id) throw new ApiError("No Stripe subscription linked", 400);
  if (sub.cancel_at_period_end) {
    return { alreadyScheduled: true, stripeSubscriptionId: sub.stripe_subscription_id };
  }

  await stripe.subscriptions.update(sub.stripe_subscription_id, cancelAtPeriodEndParams(actor));

  // Stamp the row now so the UI's immediate refetch is deterministic; the
  // webhook (customer.subscription.updated) confirms the same value and sends
  // the "cancellation scheduled" email. If the stamp fails, the webhook will
  // still correct it — log, don't fail.
  const { error } = await db.from(table).update({ cancel_at_period_end: true }).eq("id", sub.id);
  if (error) {
    console.error(`${LOG} Stripe cancel scheduled but DB stamp failed:`, table, error);
  }

  return { alreadyScheduled: false, stripeSubscriptionId: sub.stripe_subscription_id };
}

export type VehicleUnsubscribeOutcome = "removed" | "promoted" | "canceled" | "already-scheduled";

/**
 * Admin "Unsubscribe" on any vehicle, primary included. See
 * planVehicleUnsubscribe for what each case does.
 */
export async function unsubscribeVehicle(
  db: SupabaseClient,
  userId: string,
  subscriptionVehicleId: string,
  actor: SubscriptionActor,
): Promise<{
  outcome: VehicleUnsubscribeOutcome;
  stripeSubscriptionId: string;
  licensePlate: string | null;
  newPrimaryPlate?: string | null;
}> {
  const ctx = await loadActiveExpress(db, userId);
  const plan = planVehicleUnsubscribe(ctx.vehicles, subscriptionVehicleId);
  if (!plan) throw new ApiError("Vehicle not found on this subscription", 404);

  const base = {
    stripeSubscriptionId: ctx.sub.stripe_subscription_id,
    licensePlate: plateOf(plan.target),
  };

  switch (plan.kind) {
    case "remove-family":
      await removeFamily(db, userId, ctx, plan.target, actor);
      return { ...base, outcome: "removed" };
    case "promote":
      await promote(db, userId, ctx, plan.target, plan.newPrimary, actor);
      return { ...base, outcome: "promoted", newPrimaryPlate: plateOf(plan.newPrimary) };
    case "cancel-subscription": {
      const { alreadyScheduled } = await cancelSubscriptionAtPeriodEnd(db, userId, "express", actor);
      return { ...base, outcome: alreadyScheduled ? "already-scheduled" : "canceled" };
    }
  }
}

export type AdminSubscriptionAction =
  | "add_vehicle"
  | "remove_vehicle"
  | "promote_and_remove_primary"
  | "cancel_subscription";

/**
 * Audit trail for admin-initiated changes: who, for whom, what, and the
 * customer's reason. Written after the change succeeds; a failed write is
 * logged loudly rather than reported as a failed cancellation, because the
 * billing change has already happened.
 */
export async function recordAdminSubscriptionAction(
  db: SupabaseClient,
  entry: {
    adminId: string;
    userId: string;
    action: AdminSubscriptionAction;
    product: SubscriptionProduct;
    stripeSubscriptionId: string;
    reason: string;
    subscriptionVehicleId?: string | null;
    licensePlate?: string | null;
    details?: Record<string, unknown>;
  },
) {
  const { error } = await db.from("admin_subscription_actions").insert({
    admin_id: entry.adminId,
    user_id: entry.userId,
    action: entry.action,
    product: entry.product,
    stripe_subscription_id: entry.stripeSubscriptionId,
    subscription_vehicle_id: entry.subscriptionVehicleId ?? null,
    license_plate: entry.licensePlate ?? null,
    reason: entry.reason,
    details: entry.details ?? {},
  });
  if (error) {
    console.error(`${LOG} AUDIT WRITE FAILED — record this manually:`, entry, error);
  }
}
