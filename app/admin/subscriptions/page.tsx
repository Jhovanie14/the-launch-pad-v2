import { AdminSidebar } from "@/components/admin/sidebar";
import { getUserProfile } from "@/auth/actions";
import SubscriptionView from "./subscription-view";

export default async function SubscriptionPage() {
  const profile = await getUserProfile();

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar user={profile} />
      <div className="flex-1 flex flex-col overflow-hidden mx-auto py-8 px-4 md:px-6">
        <SubscriptionView />
      </div>
    </div>
  );
}
