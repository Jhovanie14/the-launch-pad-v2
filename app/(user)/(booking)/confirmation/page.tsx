import BookingStepShell from "@/components/booking/BookingStepShell";
import { getBookingStepData } from "@/lib/booking/bookingStepRequest";

// Loads the step on the server, so it opens with its content already there.
export default async function GuestConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initial = await getBookingStepData("confirmation", await searchParams);
  return <BookingStepShell variant="guest" step="confirmation" initial={initial} />;
}
