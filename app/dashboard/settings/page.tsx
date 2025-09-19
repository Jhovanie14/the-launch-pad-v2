import { getUserProfile } from "@/auth/actions";
import { UserProfile } from "./setting";
import { AuthNavbar } from "@/components/user/authNavbar";

export default async function SettingsPage() {
  const user = await getUserProfile();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthNavbar user={user} />
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-y-6">
            <UserProfile user={user} />
          </div>
        </div>
      </main>
    </div>
  );
}
