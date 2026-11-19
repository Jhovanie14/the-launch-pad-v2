import type { Metadata } from "next";
import BookingReceipt from "@/components/booking/BookingReceipt";
import { loadBookingReceipt } from "@/lib/booking/bookingReceiptData";

export const metadata: Metadata = {
  title: "You're booked",
  robots: { index: false, follow: false },
};

/** Signed-in customers land here after booking. */
export default async function DashboardSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; booking_id?: string }>;
}) {
  const receipt = await loadBookingReceipt(await searchParams);
  return <BookingReceipt receipt={receipt} action={{ href: "/dashboard/bookings", label: "See your bookings" }} />;
}
