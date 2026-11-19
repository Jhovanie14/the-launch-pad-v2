import type { Metadata } from "next";
import BookingReceipt from "@/components/booking/BookingReceipt";
import { loadBookingReceipt } from "@/lib/booking/bookingReceiptData";

export const metadata: Metadata = {
  title: "You're booked",
  robots: { index: false, follow: false },
};

/** Guests land here after booking (Stripe's redirect for card, or a cash booking). */
export default async function GuestSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; booking_id?: string }>;
}) {
  const receipt = await loadBookingReceipt(await searchParams);
  return <BookingReceipt receipt={receipt} action={{ href: "/signup", label: "Create a free account" }} />;
}
