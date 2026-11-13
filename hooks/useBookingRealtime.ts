import { Booking } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { useEffect } from "react";

type WatchedTable = "bookings" | "vehicles" | "booking_add_ons";

/** One live change, reported after the booking has been refetched (null when it was deleted). */
export type BookingRealtimeChange = {
  table: WatchedTable;
  type: "INSERT" | "UPDATE" | "DELETE";
  id: string;
  booking: Booking | null;
};

/**
 * Keeps bookings live. Pass `setBookings` to have a single list kept in sync,
 * or `null` and handle each change in `onChange` (which must be stable, e.g.
 * from useCallback, since it is an effect dependency).
 */
export function useBookingRealtime(
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>> | null,
  onNewBooking?: (booking: Booking) => void,
  onChange?: (change: BookingRealtimeChange) => void
) {
  const supabase = createClient();

  useEffect(() => {
    // Tables to watch
    const tablesToSubscribe: WatchedTable[] = [
      "bookings",
      "vehicles",
      "booking_add_ons",
    ];

    const channels: any[] = [];

    tablesToSubscribe.forEach((table) => {
      const channel = supabase
        .channel(`${table}-changes`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          async (payload: any) => {
            let affectedBookingId: string | null = null;

            // Determine booking id based on table
            switch (table) {
              case "bookings":
                affectedBookingId = payload.new?.id ?? payload.old?.id ?? null;
                break;
              case "vehicles":
                affectedBookingId =
                  payload.new?.booking_id ?? payload.old?.booking_id ?? null;
                break;
              case "booking_add_ons":
                affectedBookingId =
                  payload.new?.booking_id ?? payload.old?.booking_id ?? null;
                break;
            }

            if (!affectedBookingId) return;
            const bookingId: string = affectedBookingId;

            // A deleted booking can't be refetched: remove it directly.
            if (table === "bookings" && payload.eventType === "DELETE") {
              setBookings?.((current) => current.filter((b) => b.id !== bookingId));
              onChange?.({ table, type: "DELETE", id: bookingId, booking: null });
              return;
            }

            // Fetch full booking with vehicle and add-ons
            const { data, error } = await supabase
              .from("bookings")
              .select(
                `
                *,
                vehicle:vehicles ( year, make, model, body_type, colors, license_plate ),
                booking_add_ons (
                  add_ons ( id, name, price, duration, is_active )
                )
              `
              )
              .eq("id", bookingId)
              .single();

            if (error || !data) return;

            const fullBooking: Booking = {
              ...data,
              add_ons:
                data.booking_add_ons
                  ?.map((ba: any) => ba.add_ons)
                  .filter(Boolean) || [],
            };

            // Update state
            setBookings?.((current) => {
              const exists = current.some((b) => b.id === fullBooking.id);
              if (payload.eventType === "INSERT") {
                // Trigger notification for new bookings
                if (onNewBooking && !exists) onNewBooking(fullBooking);
                return exists ? current : [fullBooking, ...current];
              }
              // UPDATE, or a vehicle / add-on row changing under the booking.
              return current.map((b) => (b.id === fullBooking.id ? fullBooking : b));
            });

            onChange?.({ table, type: payload.eventType, id: bookingId, booking: fullBooking });
          }
        )
        .subscribe();

      channels.push(channel);
    });

    // Cleanup
    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [supabase, setBookings, onNewBooking, onChange]);
}
