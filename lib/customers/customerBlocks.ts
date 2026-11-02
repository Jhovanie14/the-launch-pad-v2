import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";

/**
 * Customers staff have blocked from taking a membership again (table
 * public.customer_blocks). Matching — email aliases, plate spacing — lives
 * in the database (public.find_customer_block) so the sign-up hook and the
 * app always agree.
 *
 * `db` must be the service-role client: the lookup function isn't callable
 * by customers, so they can't probe which emails or plates are blocked.
 */

export type CustomerBlockKind = "email" | "license_plate";

export interface CustomerBlockMatch {
  kind: CustomerBlockKind;
  value: string;
}

/** Deliberately vague: don't tell a blocked customer which detail matched. */
export const CUSTOMER_BLOCKED_MESSAGE =
  "We're unable to offer a membership on this account. Please contact us if you have questions.";

const LOG = "[customer-blocks]";

/**
 * The block matching this email or any of these plates, or null.
 *
 * Fails open: if the lookup itself errors, the sale goes ahead and the error
 * is logged. A broken check must not stop every customer from checking out
 * to keep out the few who are blocked.
 */
export async function findCustomerBlock(
  db: SupabaseClient,
  who: { email?: string | null; plates?: (string | null | undefined)[] },
): Promise<CustomerBlockMatch | null> {
  const email = who.email?.trim() || null;
  const plates = (who.plates ?? []).map((p) => p?.trim()).filter((p): p is string => !!p);
  if (!email && plates.length === 0) return null;

  const { data, error } = await db.rpc("find_customer_block", { p_email: email, p_plates: plates });
  if (error) {
    console.error(`${LOG} lookup failed, allowing:`, error);
    return null;
  }
  const match = (data as CustomerBlockMatch[] | null)?.[0];
  return match ?? null;
}

/**
 * Every plate this customer has had on a membership or saved to their
 * account. Membership vehicles are matched through the subscription, since
 * checkout creates those vehicle rows without a user_id.
 */
async function platesOfCustomer(db: SupabaseClient, userId: string): Promise<string[]> {
  const [express, selfService, saved] = await Promise.all([
    db.from("user_subscription").select("subscription_vehicles(vehicles(license_plate))").eq("user_id", userId),
    db
      .from("self_service_subscriptions")
      .select("self_service_subscription_vehicles(vehicles(license_plate))")
      .eq("user_id", userId),
    db.from("vehicles").select("license_plate").eq("user_id", userId),
  ]);
  const failed = express.error ?? selfService.error ?? saved.error;
  if (failed) {
    console.error(`${LOG} loading plates failed:`, failed);
    throw new ApiError("Could not load this customer's vehicles. Please try again.", 500);
  }

  const plates = [
    ...(express.data ?? []).flatMap((s: any) =>
      (s.subscription_vehicles ?? []).map((sv: any) => sv.vehicles?.license_plate),
    ),
    ...(selfService.data ?? []).flatMap((s: any) =>
      (s.self_service_subscription_vehicles ?? []).map((sv: any) => sv.vehicles?.license_plate),
    ),
    ...(saved.data ?? []).map((v: any) => v.license_plate),
  ];
  return [...new Set(plates.map((p) => (typeof p === "string" ? p.trim().toUpperCase() : "")).filter(Boolean))];
}

/**
 * Block a customer: their account email and every plate they've used, so a
 * new account with either is refused. Already-blocked values are left as
 * they are. Doesn't touch their subscription — cancel that separately.
 */
export async function blockCustomer(
  db: SupabaseClient,
  userId: string,
  adminId: string,
  reason: string,
): Promise<{ email: string | null; plates: string[] }> {
  if (userId === adminId) throw new ApiError("You can't block your own account", 400);

  const [{ data: authData }, { data: profile }] = await Promise.all([
    db.auth.admin.getUserById(userId),
    db.from("profiles").select("email, role").eq("id", userId).maybeSingle(),
  ]);
  if (!authData?.user && !profile) throw new ApiError("Customer not found", 404);
  if (profile?.role === "admin") throw new ApiError("Staff accounts can't be blocked", 400);

  const email = authData?.user?.email ?? profile?.email ?? null;
  const plates = await platesOfCustomer(db, userId);

  const rows = [
    ...(email ? [{ kind: "email" as const, value: email }] : []),
    ...plates.map((value) => ({ kind: "license_plate" as const, value })),
  ].map((row) => ({ ...row, user_id: userId, admin_id: adminId, reason }));
  if (rows.length === 0) throw new ApiError("This customer has no email or plates to block", 400);

  const { error } = await db
    .from("customer_blocks")
    .upsert(rows, { onConflict: "kind,normalized", ignoreDuplicates: true });
  if (error) {
    console.error(`${LOG} block failed:`, error);
    throw new ApiError("Could not save the block. Please try again.", 500);
  }

  return { email, plates };
}

/** Remove every block made for this customer. Returns how many were removed. */
export async function unblockCustomer(db: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await db.from("customer_blocks").delete().eq("user_id", userId).select("id");
  if (error) {
    console.error(`${LOG} unblock failed:`, error);
    throw new ApiError("Could not remove the block. Please try again.", 500);
  }
  return data?.length ?? 0;
}

/** Throws a 403 when the email or any plate is blocked. */
export async function assertNotBlocked(
  db: SupabaseClient,
  who: { email?: string | null; plates?: (string | null | undefined)[] },
): Promise<void> {
  const match = await findCustomerBlock(db, who);
  if (match) {
    console.warn(`${LOG} refused: blocked ${match.kind}`);
    throw new ApiError(CUSTOMER_BLOCKED_MESSAGE, 403);
  }
}
