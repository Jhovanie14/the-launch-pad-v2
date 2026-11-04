"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import type { HomeBooking, HomeOrder, HomeUsageLog } from "@/lib/dashboard/home";

/**
 * The customer's own bookings, self-service visits and product orders for the
 * dashboard home. RLS limits every query to the signed-in user's rows.
 */
export function useDashboardHome() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<HomeBooking[]>([]);
  const [logs, setLogs] = useState<HomeUsageLog[]>([]);
  const [orders, setOrders] = useState<HomeOrder[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [b, l, o, r] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, status, appointment_date, appointment_time, service_package_id, service_package_name, vehicle_id, completed_at, created_at, vehicle:vehicles (year, make, model, license_plate)",
          )
          .eq("user_id", user.id)
          .order("appointment_date", { ascending: false })
          .limit(20),
        supabase
          .from("self_service_usage_logs")
          .select("id, check_in_time, check_out_time, status, vehicle:vehicles (year, make, model, license_plate)")
          .eq("user_id", user.id)
          .order("check_in_time", { ascending: false })
          .limit(10),
        supabase
          .from("product_orders")
          .select("id, status, fulfillment_method, total, created_at")
          .eq("user_id", user.id)
          .not("status", "in", "(pending,cancelled)")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("reviews").select("booking_id").eq("user_id", user.id),
      ]);
      const firstError = b.error ?? l.error ?? o.error;
      if (firstError) throw firstError;
      setBookings((b.data ?? []) as unknown as HomeBooking[]);
      setLogs((l.data ?? []) as unknown as HomeUsageLog[]);
      setOrders((o.data ?? []) as HomeOrder[]);
      // Reviews are a nicety: if they fail to load, just don't ask for one.
      setReviewedIds(
        r.error ? new Set(((b.data ?? []) as { id: string }[]).map((x) => x.id)) : new Set((r.data ?? []).map((x) => x.booking_id as string)),
      );
    } catch (err) {
      console.error("[dashboard] home data failed to load:", err);
      setError("Couldn't load your visits.");
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const markReviewed = useCallback((bookingId: string) => {
    setReviewedIds((prev) => new Set(prev).add(bookingId));
  }, []);

  return { bookings, logs, orders, reviewedIds, markReviewed, loading, error, reload: load };
}
