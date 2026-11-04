import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Daily retry for consent changes that did not reach Resend at the time
 * (resend_synced_at is null). Oldest first, a bounded batch per run.
 */
export async function resyncUnsynced(
  db: SupabaseClient,
  sync: (c: { email: string; subscribed: boolean }) => Promise<boolean>,
  limit = 100,
): Promise<{ attempted: number; synced: number }> {
  const { data, error } = await db
    .from("marketing_consents")
    .select("id, email, status")
    .is("resend_synced_at", null)
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as { id: string; email: string; status: string }[];
  let synced = 0;
  for (const row of rows) {
    let ok = false;
    try {
      ok = await sync({ email: row.email, subscribed: row.status === "subscribed" });
    } catch (err) {
      console.error("[marketing] resync threw:", err);
    }
    if (!ok) continue;

    const { error: stampError } = await db
      .from("marketing_consents")
      .update({ resend_synced_at: new Date().toISOString() })
      .eq("id", row.id);
    if (stampError) {
      console.error("[marketing] resync stamp failed:", stampError);
      continue;
    }
    synced++;
  }
  return { attempted: rows.length, synced };
}
