import { getUserProfile } from "@/auth/actions";
import { AdminSidebar } from "@/components/admin/sidebar";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The launch pad admin",
  description: "Houston's Premier Car Care & Food Hub",
};

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
