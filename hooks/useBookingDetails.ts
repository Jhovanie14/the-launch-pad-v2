"use client";

import { useState, useEffect, useMemo } from "react";
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

  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    loadBookings();
  }, [user?.id, supabase]);

  async function loadBookings() {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await bookingService.getBookingsWithDetails(
        supabase,
        user.id,
        20
      );
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  async function checkReviews() {
    if (!user?.id || bookings.length === 0) return;

    const results: Record<string, boolean> = {};

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

    setReviewedBookings(results);
  }

  return {
    bookings,
    loading,
    error,
    reviewedBookings,
    setBookings, // For realtime updates
    refetch: loadBookings,
  };
}
