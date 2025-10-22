"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/auth-context";
import { bookingService } from "@/lib/services/bookingService";
import { Booking } from "@/types";

export function useBookingDetails() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewedBookings, setReviewedBookings] = useState<
    Record<string, boolean>
  >({});
  const [totalBookings, setTotalBookings] = useState(0);
  const pageSize = 6;

  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    loadBookings();
  }, [user?.id]);

  const loadBookings = useCallback(
    async (page: number = 1, userId?: string) => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);
        setBookings([]);

        const offset = (page - 1) * pageSize;

        // Fetch paginated bookings
        const data = await bookingService.getBookingsWithDetails(
          supabase,
          userId,
          pageSize,
          offset
        );

        setBookings(data);

        // Fetch total bookings count for pagination
        const { count } = await supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        setTotalBookings(count || 0);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load bookings"
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );
  async function checkReviews() {
    if (!user?.id || bookings.length === 0) return;

    const results: Record<string, boolean> = {};
    // console.log("boo");
    // Check all bookings in parallel
    await Promise.all(
      bookings.map(async (booking) => {
        const hasReview = await bookingService.checkReviewExists(
          supabase,
          booking.id,
          user.id
        );
        results[booking.id] = hasReview;
      })
    );

    // console.log(results);

    setReviewedBookings(results);
  }
  useEffect(() => {
    if (user?.id && bookings.length > 0) {
      checkReviews(); // runs automatically when bookings are loaded
    }
  }, [user?.id, bookings]);

  return {
    bookings,
    reviewedBookings,
    setBookings,
    setReviewedBookings,
    loadBookings,
    checkReviews,
    loading,
    error,
    totalBookings,
    pageSize,
  };
}
