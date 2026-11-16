import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { AuthError, requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { stripe } from "@/lib/stripe/stripe";
import { blockAfterCancel } from "@/lib/customers/blockAndUnsubscribe";
import { sendMembershipEndedNowEmail } from "@/lib/email/subscription-emails";
import {
  cancelNow,
  loadCancelNowQuote,
  type CancelNowProduct,
  type CancelNowStripe,
  type RefundKind,
} from "@/lib/subscriptions/cancelNow";
import { recordAdminSubscriptionAction } from "@/lib/subscriptions/subscriptionActions";

/**
 * Super admins end a membership immediately ("Cancel now").
 * Design: docs/superpowers/specs/2026-11-16-admin-cancel-now-design.md
 *
 *   { userId, product, preview: true }
 *     → { paid, full, prorated, unusedDays, periodDays } in dollars, for the dialog.
 *
 *   { userId, product, refund: "full" | "prorated" | "none", reason, alsoBlock? }
 *     Cancels in Stripe now, then refunds (amount worked out here, never taken
 *     from the client), then audit, optional block, and the customer notice.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRODUCTS: CancelNowProduct[] = ["express", "self_service"];
const REFUNDS: RefundKind[] = ["full", "prorated", "none"];
const MAX_REASON_LENGTH = 500;
const dollars = (cents: number) => Math.round(cents) / 100;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const adminUser = await requireAdmin(supabase, admin);

    // Super admins only, like Delete booking: this moves money and can't be undone.
    const { data: me } = await admin.from("profiles").select("user_type").eq("id", adminUser.id).maybeSingle();
    if (me?.user_type !== "super_admin") throw new AuthError("Only super admins can cancel a membership now", 403);

    const body = await req.json().catch(() => null);
    const userId = body?.userId;
    const product = body?.product as CancelNowProduct;
    if (typeof userId !== "string" || !UUID.test(userId)) throw new ApiError("A valid userId is required", 400);
    if (!PRODUCTS.includes(product)) throw new ApiError("Invalid product", 400);

    const client = stripe as unknown as CancelNowStripe;

    if (body.preview === true) {
      const q = await loadCancelNowQuote(admin, client, userId, product);
      return NextResponse.json({
        paid: dollars(q.paidCents),
        full: dollars(q.fullCents),
        prorated: dollars(q.proratedCents),
        unusedDays: q.unusedDays,
        periodDays: q.periodDays,
      });
    }

    const refund = body.refund as RefundKind;
    if (!REFUNDS.includes(refund)) throw new ApiError("Choose a refund option", 400);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) throw new ApiError("A reason is required", 400);
    if (reason.length > MAX_REASON_LENGTH) throw new ApiError(`Keep the reason under ${MAX_REASON_LENGTH} characters`, 400);

    const result = await cancelNow(admin, client, { userId, product, refund, adminId: adminUser.id, reason });
    const refunded = dollars(result.refundedCents);

    // From here on the cancel (and any refund) has happened: nothing below may
    // turn that into an error the admin reads as "nothing happened".
    await recordAdminSubscriptionAction(admin, {
      adminId: adminUser.id,
      userId,
      action: "cancel_subscription",
      product,
      stripeSubscriptionId: result.quote.stripeSubscriptionId,
      reason,
      details: { immediate: true, refund_kind: refund, refund_amount: refunded, refund_error: result.refundError },
    });

    const block = await blockAfterCancel(body.alsoBlock === true, admin, userId, adminUser.id, reason);

    let emailNote = " The customer has been emailed.";
    let emailFailed = false;
    try {
      const [{ data: authData }, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(userId),
        admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      ]);
      const to = authData?.user?.email;
      if (to) {
        const sent = await sendMembershipEndedNowEmail({
          to,
          name: profile?.full_name ?? "",
          refundedAmount: result.refundedCents > 0 ? refunded : null,
        });
        if (!sent) {
          emailFailed = true;
          emailNote = " The email to the customer could not be sent, so let them know yourself.";
        }
      } else {
        emailFailed = true;
        emailNote = " No email on file, so let the customer know yourself.";
      }
    } catch (err) {
      console.error("[cancel-now] notice email failed:", err);
      emailFailed = true;
      emailNote = " The email to the customer failed, so let them know yourself.";
    }

    const refundNote =
      refund === "none" || (result.refundedCents === 0 && !result.refundError)
        ? " No refund."
        : result.refundError
          ? ` The refund failed (${result.refundError}): refund it in Stripe.`
          : ` Refunded $${refunded.toFixed(2)}.`;
    const warnings = [
      result.refundError ? "refund" : null,
      block.warning ?? null,
      emailFailed ? "email" : null,
    ].filter(Boolean);

    return NextResponse.json({
      success: true,
      message: `Membership cancelled now.${refundNote}${block.warning ? ` ${block.warning}` : block.blockedNote ?? ""}${emailNote}`,
      ...(warnings.length ? { warning: true } : {}),
    });
  } catch (err) {
    return apiError(err);
  }
}
