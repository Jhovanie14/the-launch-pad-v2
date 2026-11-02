import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { blockCustomer } from "@/lib/customers/customerBlocks";
import { parseCustomerBlockRequest } from "./request";

/**
 * Block a customer from taking a membership again: their email and every
 * plate they've used go on the block list (see lib/customers/customerBlocks).
 * Their current subscription is left alone — cancel it separately.
 *
 *   { userId, reason }
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const adminUser = await requireAdmin(supabase, admin);
    const { userId, reason } = parseCustomerBlockRequest(await req.json().catch(() => null));

    const { email, plates } = await blockCustomer(admin, userId, adminUser.id, reason);

    const blocked = [email, ...plates].filter(Boolean).join(", ");
    return NextResponse.json({ success: true, email, plates, message: `Blocked: ${blocked}` });
  } catch (err) {
    return apiError(err);
  }
}
