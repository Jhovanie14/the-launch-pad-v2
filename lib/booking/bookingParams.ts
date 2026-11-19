// The booking flow's step state lives in the URL (service → datetime →
// confirmation pass params). These pure helpers are the only place that
// reads/writes that contract.

export type BookingStep = "service" | "datetime" | "confirmation";

export interface BookingSelection {
  licensePlate: string;
  vehicleId: string;
  serviceId: string | null;
  addOnIds: string[];
  date: string | null; // YYYY-MM-DD
  time: string | null; // 24h "H:MM"
}

const clean = (v: string | null): string =>
  !v || v === "null" || v === "undefined" ? "" : v;

export function parseBookingSelection(sp: URLSearchParams): BookingSelection {
  return {
    licensePlate: clean(sp.get("license_plate")),
    vehicleId: clean(sp.get("vehicle_id")),
    serviceId: clean(sp.get("service")) || null,
    addOnIds: clean(sp.get("addons")).split(",").filter(Boolean),
    date: clean(sp.get("date")) || null,
    time: clean(sp.get("time")) || null,
  };
}

export function buildBookingSearch(sel: BookingSelection): string {
  const params = new URLSearchParams();
  if (sel.licensePlate) params.set("license_plate", sel.licensePlate);
  if (sel.vehicleId) params.set("vehicle_id", sel.vehicleId);
  if (sel.serviceId) params.set("service", sel.serviceId);
  if (sel.addOnIds.length > 0) params.set("addons", sel.addOnIds.join(","));
  if (sel.date) params.set("date", sel.date);
  if (sel.time) params.set("time", sel.time);
  return params.toString();
}

/** A server page's searchParams as URLSearchParams (first value of a repeated key). */
export function searchParamsFromRecord(
  record: Record<string, string | string[] | undefined>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) params.set(key, first);
  }
  return params;
}

/**
 * What the server loads for a selection: the car, the service and the add-ons.
 * Date and time are left out; they need no lookup.
 */
export function bookingSelectionKey(sel: BookingSelection): string {
  return buildBookingSearch({ ...sel, date: null, time: null });
}
