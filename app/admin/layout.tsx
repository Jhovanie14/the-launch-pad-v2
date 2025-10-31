import { getUserProfile } from "@/auth/actions";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Toaster } from "sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar user={profile} />
      {children}
      <Toaster richColors position="top-right" />
    </div>
  );
}
