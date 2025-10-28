// app/(public)/layout.tsx
import { UserNavbar } from "@/components/user/navbar";
import { Footer } from "@/components/user/footer";
import { Toaster } from "sonner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar />
      <div>{children}</div>
      <Toaster richColors position="top-right" />
      <Footer />
    </div>
  );
}
