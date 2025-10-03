import { SupabaseClient } from "@supabase/supabase-js";
import { Booking } from "@/types";

export const bookingService = {
  async getBookings(
    supabase: SupabaseClient,
    userId: string
  ): Promise<Booking[]> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getBookingById(
    supabase: SupabaseClient,
    bookingId: string
  ): Promise<Booking> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error) throw error;
    return data;
  },

  async getBookingStats(supabase: SupabaseClient, userId: string) {
    const now = new Date();
    const thisMonthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();
    const thisMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    ).toISOString();
    const lastMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    ).toISOString();
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59
    ).toISOString();

    const [thisMonth, lastMonth, completed] = await Promise.all([
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", thisMonthStart)
        .lte("created_at", thisMonthEnd),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", lastMonthStart)
        .lte("created_at", lastMonthEnd),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed"),
    ]);

    if (thisMonth.error || lastMonth.error || completed.error) {
      throw thisMonth.error || lastMonth.error || completed.error;
    }

    return {
      thisMonth: thisMonth.count ?? 0,
      lastMonth: lastMonth.count ?? 0,
      completed: completed.count ?? 0,
      difference: (thisMonth.count ?? 0) - (lastMonth.count ?? 0),
    };
  },

  async getRecentBookings(
    supabase: SupabaseClient,
    userId: string,
    limit: number = 3
  ) {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async createBooking(
    supabase: SupabaseClient,
    booking: Omit<Booking, "id" | "created_at" | "updated_at">
  ): Promise<Booking> {
    const { data, error } = await supabase
      .from("bookings")
      .insert(booking)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateBooking(
    supabase: SupabaseClient,
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<Booking> {
    const { data, error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", bookingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getBookingsWithDetails(
    supabase: SupabaseClient,
    userId: string,
    limit: number = 20
  ) {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `*,
        vehicle:vehicles (year, make, model, trim, body_type, colors),
        add_ons (name, price)
        `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async checkReviewExists(
    supabase: SupabaseClient,
    bookingId: string,
    userId: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("user_id", userId)
      .maybeSingle();

    return !!data;
  },

  async cancelBooking(
    supabase: SupabaseClient,
    bookingId: string
  ): Promise<Booking> {
    return this.updateBooking(supabase, bookingId, { status: "cancelled" });
  },
};
