import { AdminSidebar } from "@/components/admin/sidebar";
import { getUserProfile } from "@/auth/actions";
import BookingsView from "./booking-view";

export default async function ServicesPage() {
  const profile = await getUserProfile();

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar user={profile} />
      <div className="container mx-auto py-8 px-4 md:px-6">
        <BookingsView />
      </div>
    </div>
  );
}
