import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { isTriageAction, statusForAction } from "@/lib/contacts/status";

/**
 * Staff triage for contact-form messages: file as spam, archive, restore, or
 * delete outright. Writes go through the service role behind requireAdmin so
 * they don't depend on UPDATE/DELETE policies on `public.contacts`, which were
 * created in the dashboard and aren't recorded in this repo.
 */

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const { id, action } = await req.json();
    if (!id || typeof id !== "string" || !isTriageAction(action)) {
      throw new ApiError("Invalid contact update", 400);
    }

    const { data: contact } = await admin
      .from("contacts")
      .select("id, status, replied_at")
      .eq("id", id)
      .maybeSingle();
    if (!contact) throw new ApiError("Message not found", 404);

    const status = statusForAction(action, contact);
    const { data: updated, error } = await admin
      .from("contacts")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new ApiError("Failed to update the message", 500);

    return NextResponse.json({ contact: updated });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      throw new ApiError("Invalid contact id", 400);
    }

    const { error, count } = await admin
      .from("contacts")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw new ApiError("Failed to delete the message", 500);
    if (!count) throw new ApiError("Message not found", 404);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
