// The booking flow's step state lives in the URL (service → datetime →
// confirmation pass params). These pure helpers are the only place that
// reads/writes that contract.

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
