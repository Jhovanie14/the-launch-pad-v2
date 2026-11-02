import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { unblockCustomer } from "@/lib/customers/customerBlocks";
import { parseCustomerBlockRequest } from "../request";

/**
 * Lift every block made for this customer, so they can sign up and buy a
 * membership again. The reason is logged with the admin who did it.
 *
 *   { userId, reason }
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const adminUser = await requireAdmin(supabase, admin);
    const { userId, reason } = parseCustomerBlockRequest(await req.json().catch(() => null));

    const removed = await unblockCustomer(admin, userId);
    console.log("[customer-blocks] unblocked", { userId, adminId: adminUser.id, removed, reason });

    return NextResponse.json({
      success: true,
      removed,
      message: removed > 0 ? "Customer unblocked." : "This customer had no blocks.",
    });
  } catch (err) {
    return apiError(err);
  }
}
