import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getActiveSubscription } from "@/lib/services/subscriptionService";
import { parseBookingSelection, searchParamsFromRecord, type BookingStep } from "./bookingParams";
import { loadBookingStep, type BookingInitialData } from "./loadBookingStep";
import { describeVehicle } from "./vehicleDisplay";

/**
 * Server only (reads the request's cookies). Everything a booking step page
 * shows, for the signed-in user if there is one, loaded in one pass.
 */
export async function getBookingStepData(
  step: BookingStep,
  searchParams: Record<string, string | string[] | undefined>
): Promise<BookingInitialData> {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  // "Not signed in" is a normal answer; any other error (Auth down or slow)
  // means we don't know who this is, and the browser must check instead.
  const signInUnknown = !!error && !isAuthSessionMissingError(error);

  return loadBookingStep({
    step,
    selection: parseBookingSelection(searchParamsFromRecord(searchParams)),
    db,
    user: signInUnknown
      ? undefined
      : user
      ? {
          id: user.id,
          email: user.email ?? null,
          fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
        }
      : null,
    getSubscription: (userId) => getActiveSubscription(db, userId),
    getVehicle: (userId, sel) => describeVehicle(createAdminClient(), userId, sel),
  });
}
