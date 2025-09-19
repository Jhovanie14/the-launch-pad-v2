import { AdminSidebar } from "@/components/admin/sidebar";
import { getUserProfile } from "@/auth/actions";
import AddOnsView from "./addons-view";

export default async function AddOns() {
  const profile = await getUserProfile();

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar user={profile} />
      <div className="container mx-auto py-8 px-4 md:px-6">
        <AddOnsView />
      </div>
    </div>
  );
}
