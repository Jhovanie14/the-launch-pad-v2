import { AdminSidebar } from "@/components/admin/sidebar";
import { getUserProfile } from "@/auth/actions";
import ServicesView from "./services-view";

export default async function ServicesPage() {
  const profile = await getUserProfile();

  return (
    <div className="flex-1 flex flex-col overflow-hidden mx-auto py-8 px-4 md:px-6">
      <ServicesView />
    </div>
  );
}
