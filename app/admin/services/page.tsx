import { AdminSidebar } from "@/components/admin/sidebar";
import { getUserProfile } from "@/auth/actions";
import ServicesView from "./services-view";

export default async function ServicesPage() {
  const profile = await getUserProfile();

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar user={profile} />
      <div className="w-full mx-auto py-8 px-4 md:px-6">
        <ServicesView />
      </div>
    </div>
  );
}
