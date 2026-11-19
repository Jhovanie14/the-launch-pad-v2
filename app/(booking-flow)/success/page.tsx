import type { Metadata } from "next";
import BookingReceipt from "@/components/booking/BookingReceipt";
import { successActionFor } from "@/lib/booking/bookingReceipt";
import { loadBookingReceipt } from "@/lib/booking/bookingReceiptData";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "You're booked",
  robots: { index: false, follow: false },
};

/**
 * After booking on the guest URLs (Stripe's redirect for card, or a cash or
 * membership booking). Signed-in customers can book there too, so the next
 * step is chosen from the session: their bookings, or a free account.
 */
export default async function GuestSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; booking_id?: string }>;
}) {
  const [receipt, signedIn] = await Promise.all([
    loadBookingReceipt(await searchParams),
    createClient()
      .then((db) => db.auth.getUser())
      .then(({ data }) => !!data.user)
      .catch(() => false),
  ]);
  return <BookingReceipt receipt={receipt} action={successActionFor(signedIn)} />;
}
