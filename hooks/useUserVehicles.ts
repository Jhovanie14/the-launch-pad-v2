"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/auth-context";

export interface UserVehicle {
  id: string;
  license_plate: string;
  year: number | null;
  make: string | null;
  model: string | null;
  body_type: string | null;
  colors: string[] | null;
}

export function useUserVehicles() {
  const { user } = useAuth();
  const supabase = createClient();
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchVehicles = useCallback(async () => {
    if (!user?.id) {
      setVehicles([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1. Directly linked vehicles (user_id on vehicles table)
    const { data: direct } = await supabase
      .from("vehicles")
      .select("id, license_plate, year, make, model, body_type, colors")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // 2. Vehicles linked via subscriptions (express + self-service)
    const { data: subVehicles } = await supabase
      .from("subscription_vehicles")
      .select("vehicle:vehicles(id, license_plate, year, make, model, body_type, colors)")
      .in(
        "subscription_id",
        (
          await supabase
            .from("user_subscription")
            .select("id")
            .eq("user_id", user.id)
        ).data?.map((s: any) => s.id) ?? []
      );

    const { data: selfSubVehicles } = await supabase
      .from("self_service_subscription_vehicles")
      .select("vehicle:vehicles(id, license_plate, year, make, model, body_type, colors)")
      .in(
        "subscription_id",
        (
          await supabase
            .from("self_service_subscriptions")
            .select("id")
            .eq("user_id", user.id)
        ).data?.map((s: any) => s.id) ?? []
      );

    const fromSubs = [
      ...(subVehicles ?? []).map((r: any) => r.vehicle),
      ...(selfSubVehicles ?? []).map((r: any) => r.vehicle),
    ].filter(Boolean);

    // Merge and deduplicate by id
    const seen = new Set<string>();
    const merged: UserVehicle[] = [];
    for (const v of [...(direct ?? []), ...fromSubs]) {
      if (v && !seen.has(v.id)) {
        seen.add(v.id);
        merged.push(v);
      }
    }

    setVehicles(merged);
    setSubscribedIds(new Set(fromSubs.map((v) => v.id)));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const addVehicle = async (
    licensePlate: string,
    details?: { make?: string; model?: string; year?: string; body_type?: string; color?: string }
  ): Promise<boolean> => {
    if (!user?.id || !licensePlate.trim()) return false;
    const normalized = licensePlate.trim().toUpperCase();

    const extra = {
      make: details?.make?.trim() || null,
      model: details?.model?.trim() || null,
      year: details?.year ? parseInt(details.year, 10) || null : null,
      body_type: details?.body_type?.trim() || null,
      colors: details?.color?.trim() ? [details.color!.trim()] : null,
    };

    // Check if already exists for this user
    const { data: existing } = await supabase
      .from("vehicles")
      .select("id")
      .eq("license_plate", normalized)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("vehicles").update(extra).eq("id", existing.id);
      if (error) { console.error("Vehicle update error:", error); return false; }
      await fetchVehicles();
      return true;
    }

    // Check if vehicle exists but not linked to this user
    const { data: unlinked } = await supabase
      .from("vehicles")
      .select("id")
      .eq("license_plate", normalized)
      .is("user_id", null)
      .maybeSingle();

    if (unlinked) {
      const { error } = await supabase
        .from("vehicles")
        .update({ user_id: user.id, ...extra })
        .eq("id", unlinked.id);
      if (error) { console.error("Vehicle link error:", error); return false; }
    } else {
      const { error } = await supabase.from("vehicles").insert({
        license_plate: normalized,
        user_id: user.id,
        ...extra,
      });
      if (error) { console.error("Vehicle insert error:", error); return false; }
    }

    await fetchVehicles();
    return true;
  };

  const removeVehicle = async (vehicleId: string): Promise<boolean> => {
    if (!user?.id) return false;
    // Unlink from user rather than hard delete (booking history preserved)
    await supabase
      .from("vehicles")
      .update({ user_id: null })
      .eq("id", vehicleId)
      .eq("user_id", user.id);
    await fetchVehicles();
    return true;
  };

  return { vehicles, subscribedIds, loading, refetch: fetchVehicles, addVehicle, removeVehicle };
}
