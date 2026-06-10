import type { SupabaseClient, User } from "@supabase/supabase-js";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/** Returns the authenticated user or throws AuthError(401). */
export async function requireUser(supabase: SupabaseClient): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AuthError("Unauthorized", 401);
  return user;
}

/**
 * Returns the authenticated user if they are an admin, else throws.
 * Role is read from profiles.role using the admin client (single source of truth).
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  admin: SupabaseClient
): Promise<User> {
  const user = await requireUser(supabase);
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new AuthError("Forbidden", 403);
  return user;
}
