import BookingStepShell from "@/components/booking/BookingStepShell";
import { getBookingStepData } from "@/lib/booking/bookingStepRequest";

// Loads the step on the server, so it opens with its content already there.
export default async function DashboardServicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initial = await getBookingStepData("service", await searchParams);
  return <BookingStepShell variant="dashboard" step="service" initial={initial} />;
}
