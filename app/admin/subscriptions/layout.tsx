import { requireSuperAdminPage } from "@/lib/auth/superAdminPage";

// Super admins only (lib/navigation/admin.ts).
export default async function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdminPage();
  return children;
}
