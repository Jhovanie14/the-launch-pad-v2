import { LicensePlate } from "@/components/dashboard-home/license-plate";

/**
 * The booking as a navy ticket: when, what, and the car drawn as a plate.
 * Shared by the confirm step and the "you're booked" pages; it takes values
 * already formatted (formatDay / formatTime in lib/booking/bookingReceipt.ts).
 */
export default function BookingTicket({
  day,
  time,
  serviceName,
  extras,
  durationMin,
  plate,
  vehicle,
}: {
  day: string | null;
  time: string | null;
  serviceName: string | null;
  extras: (string | null)[];
  durationMin: number | null;
  plate: string | null;
  vehicle: string | null;
}) {
  const extrasText = extras.filter(Boolean).join(", ");
  const detail = [extrasText ? `Plus ${extrasText}` : "", durationMin ? `about ${durationMin} min` : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-label="Your appointment" className="rounded-2xl bg-night p-5 text-on-night ring-1 ring-paper/10 sm:p-7">
      {(day || time) && (
        <p className="text-3xl font-black leading-tight tracking-[-0.025em] sm:text-4xl">
          {day && <span className="block whitespace-nowrap">{day}</span>}
          {time && <span className="block whitespace-nowrap">{time}</span>}
        </p>
      )}
      {serviceName && <p className="mt-3 text-lg font-bold text-flame">{serviceName}</p>}
      {detail && <p className="mt-0.5 text-base text-on-night-muted">{detail}</p>}
      {plate && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-paper/10 pt-4">
          <span className="min-w-0 text-sm text-on-night-muted">
            Your car
            {vehicle && <span className="block truncate font-semibold text-on-night">{vehicle}</span>}
          </span>
          <LicensePlate plate={plate} className="px-3 py-1 text-base" />
        </div>
      )}
    </section>
  );
}
