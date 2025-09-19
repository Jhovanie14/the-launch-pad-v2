import { getUserProfile } from "@/auth/actions";
import { AuthNavbar } from "@/components/user/authNavbar";
import BookingsList from "./booking-list";

export default async function Bookings() {
  const user = await getUserProfile();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthNavbar user={user} />
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <BookingsList />
        </div>
      </main>
    </div>
  );
}
