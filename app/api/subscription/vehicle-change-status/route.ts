import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { loadVehicleChangeLock } from "@/lib/subscriptions/subscriptionActions";

/**
 * The caller's vehicle-change lock, so the billing page can show when the
 * next change is available instead of letting them hit the refusal.
 * The add-vehicle route enforces the same rule independently.
 */
export async function GET() {
  try {
    const user = await requireUser(await createClient());
    const lock = await loadVehicleChangeLock(createAdminClient(), user.id);

    return NextResponse.json(
      lock.locked
        ? {
            locked: true,
            lastChangeAt: lock.lastChangeAt.toISOString(),
            unlocksAt: lock.unlocksAt.toISOString(),
          }
        : { locked: false },
    );
  } catch (err) {
    return apiError(err);
  }
}
