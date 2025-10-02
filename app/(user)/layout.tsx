// app/(public)/layout.tsx
import { UserNavbar } from "@/components/user/navbar";
import { Footer } from "@/components/user/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
