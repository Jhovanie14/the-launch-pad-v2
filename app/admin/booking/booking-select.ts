import type { Booking } from "@/types";

/** A booking with its vehicle and add-ons, as the admin booking views show it. */
export const BOOKING_SELECT = `*,
  vehicle:vehicles ( year, make, model, body_type, colors, license_plate ),
  booking_add_ons ( add_ons ( id, name, price, duration, is_active ) )`;

export function withAddOns(rows: any[] | null): Booking[] {
  return (rows ?? []).map((b) => ({
    ...b,
    add_ons: b.booking_add_ons?.map((ba: any) => ba.add_ons).filter(Boolean) || [],
  }));
}
