import { Booking } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { useEffect } from "react";

export function useBookingRealtime(
  setBookings: React.Dispatch<React.SetStateAction<any[]>>
) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload: any) => {
          setBookings((current) => {
            const newRow = payload.new;
            const oldRow = payload.old;

            switch (payload.eventType) {
              case "INSERT":
                return [newRow, ...current]; // add new booking
              case "UPDATE":
                return current.map((b) =>
                  b.id === newRow.id ? { ...b, ...newRow } : b
                ); // update
              case "DELETE":
                return current.filter(
                  (b) => b.id !== (oldRow?.id ?? newRow?.id)
                ); // delete
              default:
                return current;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, setBookings]);
}
