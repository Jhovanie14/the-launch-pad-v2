"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
// import { revalidatePath } from "next/cache";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  return user;
}

export async function getUserProfile() {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return null;
  }

  return profile;
}

export async function getUserCount() {
  const supabase = await createClient();

  // Count all users with role "user" (all regular users who signed up)
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "user");

  if (error) {
    console.error("Error getting user count:", error);
    return 0;
  }

  return count || 0;
}
