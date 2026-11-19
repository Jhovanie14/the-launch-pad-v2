import BookingStepShell from "@/components/booking/BookingStepShell";
import { getBookingStepData } from "@/lib/booking/bookingStepRequest";

// Loads the step on the server, so it opens with its content already there.
export default async function GuestServicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initial = await getBookingStepData("service", await searchParams);
  return <BookingStepShell variant="guest" step="service" initial={initial} />;
}
