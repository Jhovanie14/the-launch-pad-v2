import { getUserProfile } from "@/auth/actions";
import { UserProfile } from "./setting";

export default async function SettingsPage() {
  const user = await getUserProfile();

  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black tracking-tight text-ink">Settings</h1>
      <UserProfile user={user} />
    </div>
  );
}
