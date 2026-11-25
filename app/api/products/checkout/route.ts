import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { placeOrder } from "@/lib/products/placeOrder";
import { getPickupSettings } from "@/lib/products/storeSettings";
import { sendProductOrderReservedEmail } from "@/lib/email/product-order-emails";
import { quoteShipping } from "@/lib/shipping/quote";
import { shippoConfigured, shippoFromEnv } from "@/lib/shipping/shippo";

/**
 * Place a store order: pay now by card (Stripe Checkout) or reserve and pay at
 * the store, or ship with USPS (card only; the shipping price is quoted again
 * here, never taken from the browser). Logic and rules live in
 * lib/products/placeOrder.ts.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const body = await req.json();

    // Service-role client: order inserts and stock changes are server-side
    // only (RLS has no write policies on product_orders by design).
    const admin = createAdminClient();
    const [{ data: profile }, settings] = await Promise.all([
      admin.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
      getPickupSettings(admin),
    ]);

    const result = await placeOrder(
      {
        db: admin,
        stripe,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
        now: new Date(),
        pickupHours: settings.pickupHours,
        pickupNote: settings.pickupNote,
        sendReserved: sendProductOrderReservedEmail,
        quote:
          body?.fulfillment_method === "delivery" && shippoConfigured()
            ? (cart, address) => quoteShipping({ shippo: shippoFromEnv(), db: admin }, cart, address)
            : undefined,
      },
      {
        userId: user.id,
        email: user.email ?? null,
        name: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        items: body?.items,
        fulfillmentMethod: body?.fulfillment_method,
        paymentMethod: body?.payment_method,
        address: body?.address,
        expectedShipping: body?.expected_shipping,
      },
    );

    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
