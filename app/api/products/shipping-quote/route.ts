import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { ApiError, apiError } from "@/lib/http/apiError";
import { quoteShipping, UNAVAILABLE } from "@/lib/shipping/quote";
import { getShippingSettings } from "@/lib/shipping/settings";
import { shippoConfigured, shippoFromEnv } from "@/lib/shipping/shippo";

/**
 * Is shipping offered, and which states are turned off? The cart asks this
 * before showing "Ship to me".
 */
export async function GET() {
  if (!shippoConfigured()) return NextResponse.json({ available: false, excludedStates: [] });
  const { excludedStates } = await getShippingSettings(createAdminClient());
  return NextResponse.json({ available: true, excludedStates });
}

/**
 * The USPS price for the cart and address. The same quote runs again at
 * checkout, so this number is for showing only.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    await requireUser(supabase);
    if (!shippoConfigured()) throw new ApiError(UNAVAILABLE, 503);

    const body = await req.json().catch(() => null);
    const quote = await quoteShipping({ shippo: shippoFromEnv(), db: createAdminClient() }, body?.items, body?.address);
    return NextResponse.json({ amount: quote.amount, service: quote.service, days: quote.days, address: quote.address });
  } catch (err) {
    return apiError(err);
  }
}
