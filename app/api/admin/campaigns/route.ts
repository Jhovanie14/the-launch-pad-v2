import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { ApiError, apiError } from "@/lib/http/apiError";
import { getResend } from "@/lib/marketing/resendContacts";
import {
  campaignConfigFromEnv,
  cancelCampaign,
  listCampaigns,
  missingCampaignConfig,
  sendCampaign,
  sendCampaignTest,
  type CampaignResendLike,
} from "@/lib/marketing/campaignSend";
import type { CampaignContent } from "@/lib/marketing/campaignEmail";

/**
 * Admin → Campaigns. GET: opted-in count, setup status and recent campaigns.
 * POST { action: "test" | "send", content, scheduledAt? }. DELETE ?id= cancels
 * a scheduled campaign. See lib/marketing/campaignSend.ts.
 */

const resend = () => getResend() as unknown as CampaignResendLike;

async function admin() {
  const supabase = await createClient();
  const db = createAdminClient();
  const user = await requireAdmin(supabase, db);
  return { user, db };
}

export async function GET() {
  try {
    const { db } = await admin();
    const cfg = campaignConfigFromEnv();

    const { count, error } = await db
      .from("marketing_consents")
      .select("id", { count: "exact", head: true })
      .eq("status", "subscribed");
    if (error) throw error;

    let campaigns: Awaited<ReturnType<typeof listCampaigns>> = [];
    let campaignsError: string | null = null;
    try {
      campaigns = await listCampaigns(resend(), cfg);
    } catch (err) {
      campaignsError = err instanceof ApiError ? err.message : "Couldn't load past campaigns.";
    }

    return NextResponse.json({
      subscribers: count ?? 0,
      missingConfig: missingCampaignConfig(cfg),
      campaigns,
      campaignsError,
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await admin();
    const { action, content, scheduledAt } = (await req.json()) as {
      action?: string;
      content?: CampaignContent;
      scheduledAt?: string;
    };
    if (!content || typeof content !== "object") throw new ApiError("Missing campaign content.", 400);

    if (action === "test") {
      if (!user.email) throw new ApiError("Your admin account has no email address to send the test to.", 400);
      await sendCampaignTest(resend(), user.email, content);
      return NextResponse.json({ sentTo: user.email });
    }

    if (action === "send") {
      const result = await sendCampaign(resend(), campaignConfigFromEnv(), content, {
        scheduledAt: scheduledAt || undefined,
      });
      return NextResponse.json(result);
    }

    throw new ApiError("Unknown action.", 400);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await admin();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError("Missing campaign id.", 400);
    await cancelCampaign(resend(), campaignConfigFromEnv(), id);
    return NextResponse.json({ cancelled: id });
  } catch (err) {
    return apiError(err);
  }
}
