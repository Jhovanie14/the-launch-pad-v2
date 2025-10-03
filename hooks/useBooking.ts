"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/auth-context";
import { bookingService } from "@/lib/services/bookingService";
import { Booking } from "@/types";

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const data = await bookingService.getBookings(supabase, user.id);
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createBooking(
    bookingData: Omit<Booking, "id" | "created_at" | "updated_at">
  ) {
    if (!user?.id) throw new Error("User not authenticated");

    try {
      const newBooking = await bookingService.createBooking(
        supabase,
        bookingData
      );
      setBookings((prev) => [newBooking, ...prev]);
      return newBooking;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking");
      throw err;
    }
  }

  async function cancelBooking(bookingId: string) {
    try {
      const updated = await bookingService.cancelBooking(supabase, bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b))
      );
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
      throw err;
    }
  }

  return {
    bookings,
    loading,
    error,
    createBooking,
    cancelBooking,
    refetch: loadBookings,
  };
}

export function useBookingStats() {
  const [stats, setStats] = useState({
    thisMonth: 0,
    completed: 0,
    difference: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    loadStats();
  }, [user?.id]);

  async function loadStats() {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [statsData, recentData] = await Promise.all([
        bookingService.getBookingStats(supabase, user.id),
        bookingService.getRecentBookings(supabase, user.id, 3),
      ]);

      setStats(statsData);
      setRecentBookings(recentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return { stats, recentBookings, loading, error };
}
