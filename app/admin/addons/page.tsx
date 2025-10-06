import { AdminSidebar } from "@/components/admin/sidebar";
import { getUserProfile } from "@/auth/actions";
import AddOnsView from "./addons-view";

export default async function AddOns() {
  const profile = await getUserProfile();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <AddOnsView />
    </div>
  );
}
