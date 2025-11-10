import { getUserProfile } from "@/auth/actions";
import SubscriptionView from "./subscription-view";

export default async function SubscriptionPage() {
  // const profile = await getUserProfile();

  return (
    <div className="flex-1 flex flex-col overflow-hidden mx-auto mt-16 lg:mt-0 p-6 md:px-6">
      <SubscriptionView />
    </div>
  );
}
