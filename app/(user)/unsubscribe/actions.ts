"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { unsubscribeByToken } from "@/lib/marketing/unsubscribeLink";

/** The "Unsubscribe" button on /unsubscribe. */
export async function unsubscribeAction(formData: FormData) {
  const token = String(formData.get("t") ?? "");
  let done = false;
  try {
    const result = await unsubscribeByToken(createAdminClient(), token, process.env.MARKETING_UNSUBSCRIBE_SECRET);
    done = result.ok;
  } catch (err) {
    console.error("[unsubscribe] failed:", err);
    redirect(`/unsubscribe?t=${encodeURIComponent(token)}&error=1`);
  }
  redirect(`/unsubscribe?t=${encodeURIComponent(token)}${done ? "&done=1" : ""}`);
}
