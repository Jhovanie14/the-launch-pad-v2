import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Who among these people has an active membership (express or self-service)?
 * A person is matched by any of their account ids, or by a profile whose
 * email matches theirs (any case), since guest bookings carry no account.
 * Marketing emails that pitch membership skip members.
 */
export async function findMemberAccounts(
  db: SupabaseClient,
  emails: string[],
  userIds: string[],
): Promise<(email: string, userIds: Iterable<string>) => boolean> {
  const profileIdByEmail = new Map<string, string>();
  if (emails.length > 0) {
    const { data, error } = await db.from("profiles").select("id, email").in("email", emails);
    if (error) throw error;
    for (const p of (data ?? []) as { id: string; email: string | null }[]) {
      if (p.email) profileIdByEmail.set(p.email.toLowerCase(), p.id);
    }
  }

  const accountIds = [...new Set([...userIds, ...profileIdByEmail.values()])];
  const members = new Set<string>();
  if (accountIds.length > 0) {
    const activePlans = (table: string) =>
      db.from(table).select("user_id").eq("status", "active").in("user_id", accountIds);
    const [plans, selfPlans] = await Promise.all([
      activePlans("user_subscription"),
      activePlans("self_service_subscriptions"),
    ]);
    for (const r of [plans, selfPlans]) if (r.error) throw r.error;
    for (const r of [...(plans.data ?? []), ...(selfPlans.data ?? [])] as { user_id: string }[]) {
      members.add(r.user_id);
    }
  }

  return (email, ids) => {
    for (const id of ids) if (members.has(id)) return true;
    const profileId = profileIdByEmail.get(email.toLowerCase());
    return !!profileId && members.has(profileId);
  };
}
