"use client"

import { getUserProfile } from "@/auth/actions";
import { AuthNavbar } from "@/components/user/authNavbar";
import BookingsList from "./booking-list";
import { useAuth } from "@/context/auth-context";
import { UserNavbar } from "@/components/user/navbar";

export default function Bookings() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <BookingsList />
        </div>
      </main>
    </div>
  );
}
