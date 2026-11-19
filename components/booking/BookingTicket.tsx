import { LicensePlate } from "@/components/dashboard-home/license-plate";
import type { VehicleDisplay } from "@/lib/booking/vehicleDisplay";
import type { AddOnRow, ServicePackageRow } from "@/types/db";

// "YYYY-MM-DD" is a calendar date: read and print it in UTC so it never
// shifts a day with the server's or the browser's timezone.
const formatDay = (date: string) =>
  new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};

/** The booking as a navy ticket: when, what, and the car drawn as a plate. */
export default function BookingTicket({
  date,
  time,
  service,
  addOns,
  duration,
  plate,
  vehicleInfo,
}: {
  date: string | null;
  time: string | null;
  service: ServicePackageRow | null;
  addOns: AddOnRow[];
  duration: number;
  plate: string;
  vehicleInfo: VehicleDisplay | null;
}) {
  const car = vehicleInfo
    ? [vehicleInfo.year, vehicleInfo.make, vehicleInfo.model].filter(Boolean).join(" ")
    : "";
  const shownPlate = vehicleInfo?.license_plate || plate;
  const extras = addOns.map((a) => a.name).join(", ");

  return (
    <section aria-label="Your booking" className="rounded-2xl bg-night p-5 text-on-night ring-1 ring-paper/10 sm:p-7">
      <p className="text-3xl font-black leading-tight tracking-[-0.025em] sm:text-4xl">
        {date && <span className="block whitespace-nowrap">{formatDay(date)}</span>}
        {time && <span className="block whitespace-nowrap">{formatTime(time)}</span>}
      </p>
      {service && <p className="mt-3 text-lg font-bold text-flame">{service.name}</p>}
      <p className="mt-0.5 text-base text-on-night-muted">
        {extras ? `Plus ${extras} · ` : ""}about {duration} min
      </p>
      {shownPlate && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-paper/10 pt-4">
          <span className="min-w-0 text-sm text-on-night-muted">
            Your car
            {car && <span className="block truncate font-semibold text-on-night">{car}</span>}
          </span>
          <LicensePlate plate={shownPlate} className="px-3 py-1 text-base" />
        </div>
      )}
    </section>
  );
}
