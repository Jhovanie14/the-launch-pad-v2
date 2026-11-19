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
  } = await db.auth.getUser();

  return loadBookingStep({
    step,
    selection: parseBookingSelection(searchParamsFromRecord(searchParams)),
    db,
    user: user
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
