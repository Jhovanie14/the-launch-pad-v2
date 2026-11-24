import { redirect } from "next/navigation";
import { getUserProfile } from "@/auth/actions";
import { isSuperAdmin } from "@/lib/navigation/admin";

/**
 * For the layouts of super-admin pages (lib/navigation/admin.ts marks them).
 * The sidebar hides those links from regular admins; this stops a regular
 * admin who types the URL. Signed-out visitors are already redirected by
 * getUserProfile and the middleware.
 */
export async function requireSuperAdminPage(): Promise<void> {
  const profile = await getUserProfile();
  if (!isSuperAdmin(profile?.user_type)) redirect("/admin/dashboard");
}
