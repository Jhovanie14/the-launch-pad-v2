import { AuthNavbar } from "@/components/user/authNavbar";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lp-theme min-h-screen bg-canvas text-ink">
      <AuthNavbar />
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
