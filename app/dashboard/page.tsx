import { getUserProfile } from "@/auth/actions";
import DashboardContent from "./dashboard-content";
import { AuthNavbar } from "@/components/user/authNavbar";
import { useAuth } from "@/context/auth-context";

export default async function DashboardPage() {
  const user = await getUserProfile();

  if (!user) return null;
  return (
    <div className="min-h-screen bg-gray-50">
      <AuthNavbar user={user} />
      <DashboardContent user={user} />
    </div>
  );
}
