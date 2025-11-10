import { AdminSidebar } from "@/components/admin/sidebar";
import { getUserProfile } from "@/auth/actions";
import ServicesView from "./services-view";

export default async function ServicesPage() {
  const profile = await getUserProfile();

  return (
    <div className="flex-1 flex flex-col overflow-hidden mx-auto  mt-16 lg:mt-0 p-6 md:px-6">
      <ServicesView />
    </div>
  );
}
