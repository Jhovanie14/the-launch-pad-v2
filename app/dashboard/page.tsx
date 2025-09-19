import { getUserProfile } from "@/auth/actions";
import { AuthNavbar } from "@/components/user/authNavbar";
import DashboardContent from "./dashboard-content";

export default async function DashboardPage() {
  const profile = await getUserProfile();

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthNavbar user={profile} />
      <DashboardContent user={profile} />
    </div>
  );
}
