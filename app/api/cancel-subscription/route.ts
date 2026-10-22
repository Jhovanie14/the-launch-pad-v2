import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { cancelSubscriptionAtPeriodEnd } from "@/lib/subscriptions/subscriptionActions";

export async function POST() {
  try {
    const user = await requireUser(await createClient());

    // Cancel at period end — never immediate, never refunded.
    await cancelSubscriptionAtPeriodEnd(createAdminClient(), user.id, "express", {
      kind: "customer",
    });

    return NextResponse.json({ canceled: true });
  } catch (err) {
    return apiError(err);
  }
}
