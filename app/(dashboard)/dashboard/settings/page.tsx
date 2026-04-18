import { getUserProfile } from "@/auth/actions";
import { UserProfile } from "./setting";
import { AuthNavbar } from "@/components/user/authNavbar";

export default async function SettingsPage() {
  const user = await getUserProfile();

  if (!user) return null;

  return (
    <main className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
        <UserProfile user={user} />
      </div>
    </main>
  );
}
