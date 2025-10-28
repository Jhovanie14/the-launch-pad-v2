import { AuthNavbar } from "@/components/user/authNavbar";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AuthNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">{children}</div>
        <Toaster richColors position="top-right" />
      </main>
    </div>
  );
}
