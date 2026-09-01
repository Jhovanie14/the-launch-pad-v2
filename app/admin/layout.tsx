import { getUserProfile } from "@/auth/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { PaymentNotification } from "@/components/payment-notification";
import { Toaster } from "sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();

  return (
    <AdminShell user={profile}>
      {children}
      <Toaster richColors position="top-right" />
      <PaymentNotification />
    </AdminShell>
  );
}
