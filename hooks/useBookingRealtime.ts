import { Booking } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { useEffect } from "react";

export function useBookingRealtime(
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>,
  onNewBooking?: (booking: Booking) => void // Add callback for new bookings
) {
  const supabase = createClient();

  useEffect(() => {
    // Tables to watch
    const tablesToSubscribe: ("bookings" | "vehicles" | "booking_add_ons")[] = [
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

            // Fetch full booking with vehicle and add-ons
            const { data, error } = await supabase
              .from("bookings")
              .select(
                `
                *,
                vehicle:vehicles ( year, make, model, body_type, colors ),
                booking_add_ons (
                  add_ons ( id, name, price, duration, is_active )
                )
              `
              )
              .eq("id", affectedBookingId)
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
            setBookings((current) => {
              switch (payload.eventType) {
                case "INSERT":
                  // Trigger notification for new bookings
                  if (
                    onNewBooking &&
                    !current.find((b) => b.id === fullBooking.id)
                  ) {
                    onNewBooking(fullBooking);
                  }
                  return current.find((b) => b.id === fullBooking.id)
                    ? current
                    : [fullBooking, ...current];
                case "UPDATE":
                  return current.map((b) =>
                    b.id === fullBooking.id ? fullBooking : b
                  );
                case "DELETE":
                  return current.filter((b) => b.id !== affectedBookingId);
                default:
                  return current;
              }
            });
          }
        )
        .subscribe();

      channels.push(channel);
    });

    // Cleanup
    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [supabase, setBookings, onNewBooking]);
}
