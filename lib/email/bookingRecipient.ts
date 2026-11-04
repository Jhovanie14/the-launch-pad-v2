import { ApiError } from "@/lib/http/apiError";

/**
 * Booking emails (tip request, receipt) must go to the address stored on the
 * booking, never to one supplied by the caller. Otherwise the endpoint becomes
 * a relay that sends branded mail from our domain to any address.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extracts a uuid `bookingId` from a request body, or throws ApiError(400). */
export function parseBookingId(body: unknown): string {
  const id =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).bookingId
      : undefined;
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    throw new ApiError("A valid bookingId is required", 400);
  }
  return id;
}

export type BookingContactRow = {
  id: string;
  customer_email: string | null;
  customer_name: string | null;
};

export type BookingRecipient = { id: string; email: string; name: string };

/** Resolves who a booking email goes to, from the booking row itself. */
export function recipientFromBooking(
  booking: BookingContactRow | null
): BookingRecipient {
  if (!booking) throw new ApiError("Booking not found", 404);
  if (!booking.customer_email) {
    throw new ApiError("Booking has no customer email", 422);
  }
  return {
    id: booking.id,
    email: booking.customer_email,
    name: booking.customer_name ?? "",
  };
}
