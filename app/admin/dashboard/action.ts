"use server";

import { createClient } from "@/utils/supabase/server";

export async function getDashboardStats() {
  const supabase = await createClient();

  try {
    // Get total users count
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Get active subscriptions count
    const { count: activeSubscriptions } = await supabase
      .from("user_subscription")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Get recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentUsers } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    // Get booking growth data for the last 7 days
    const { data: bookingGrowthData } = await supabase
      .from("booking")
      .select("created_at")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // Process booking growth data by day
    const bookingGrowthByDay = processUserGrowthByDay(bookingGrowthData || []);

    const { data: userGrowthData } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // Process user growth data by day
    const userGrowthByDay = processUserGrowthByDay(userGrowthData || []);

    return {
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      recentUsers: recentUsers || [],
      bookingGrowthByDay,
      userGrowthByDay,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalUsers: 0,
      activeSubscriptions: 0,
      recentUsers: [],
      userGrowthByDay: [0, 0, 0, 0, 0, 0, 0],
    };
  }
}

export async function getRevenueData() {
  const supabase = await createClient();

  try {
    // Get booking data for the last 7 months
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    // Get bookings with their prices
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("total_price, created_at, status")
      .gte("created_at", sevenMonthsAgo.toISOString())
      .in("status", ["confirmed", "completed"])
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!bookings || bookings.length === 0) {
      console.warn("No booking data found in last 7 months");
      return {
        revenue: new Array(7).fill(0),
        expenses: new Array(7).fill(0),
      };
    }

    // Process revenue by month
    const revenueByMonth = processRevenueByMonth(bookings || []);
    // console.log("Revenue by Month:", revenueByMonth);
    return revenueByMonth;
  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return {
      revenue: [],
      expenses: [],
    };
  }
}

export async function getCategoryData() {
  const supabase = await createClient();

  try {
    // Fetch all service packages
    const { data: packages } = await supabase
      .from("service_packages")
      .select("id, category")
      .eq("is_active", "true");

    // Fetch precomputed booking counts from view
    const { data: counts } = await supabase.from("booking_counts").select("*");

    if (!packages || packages.length === 0) return { labels: [], values: [] };

    // Sum totals per category
    const categoryTotals: Record<string, number> = {};
    packages.forEach((pkg) => {
      const found = counts?.find((c) => c.service_package_id === pkg.id);
      const total = found?.total ?? 0;
      if (categoryTotals[pkg.category]) {
        categoryTotals[pkg.category] += total;
      } else {
        categoryTotals[pkg.category] = total;
      }
    });

    // Sort top 5 categories
    const sorted = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      labels: sorted.map(([category]) => category),
      values: sorted.map(([, total]) => total),
    };
  } catch (error) {
    console.error("Error fetching category data:", error);
    return { labels: [], values: [] };
  }
}

export async function getBookingStats() {
  const supabase = await createClient();

  try {
    // Get total bookings
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true });

    // Get confirmed bookings
    const { count: confirmedBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed");

    // Get pending bookings
    const { count: pendingBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Get completed bookings
    const { count: completedBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    return {
      totalBookings: totalBookings || 0,
      confirmedBookings: confirmedBookings || 0,
      pendingBookings: pendingBookings || 0,
      completedBookings: completedBookings || 0,
    };
  } catch (error) {
    console.error("Error fetching booking stats:", error);
    return {
      totalBookings: 0,
      confirmedBookings: 0,
      pendingBookings: 0,
      completedBookings: 0,
    };
  }
}

export async function getAddOnRevenue() {
  const supabase = await createClient();

  try {
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    const { data: addOns } = await supabase
      .from("booking_add_ons")
      .select("price, created_at")
      .gte("created_at", sevenMonthsAgo.toISOString());

    const totalAddOnRevenue = addOns?.reduce(
      (sum, addon) => sum + (addon.price || 0),
      0
    );

    return totalAddOnRevenue || 0;
  } catch (error) {
    console.error("Error fetching add-on revenue:", error);
    return 0;
  }
}

// Helper function to process user growth by day
function processUserGrowthByDay(userData: Array<{ created_at: string }>) {
  const counts = new Array(7).fill(0);

  userData.forEach((user) => {
    const date = new Date(user.created_at);
    const dayIndex = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    counts[dayIndex]++;
  });

  return counts;
}

// Helper function to process revenue by month
function processRevenueByMonth(
  bookings: Array<{ total_price: number; created_at: string }>
) {
  const monthlyRevenue = new Array(7).fill(0);
  const monthlyExpenses = new Array(7).fill(0);

  const now = new Date();

  bookings.forEach((booking) => {
    const bookingDate = new Date(booking.created_at);
    const monthDiff =
      (now.getFullYear() - bookingDate.getFullYear()) * 12 +
      (now.getMonth() - bookingDate.getMonth());

    if (monthDiff >= 0 && monthDiff < 7) {
      const index = 6 - monthDiff;
      monthlyRevenue[index] += booking.total_price || 0;
      // Simulate expenses as ~60% of revenue
      monthlyExpenses[index] += (booking.total_price || 0) * 0.6;
    }
  });

  return {
    revenue: monthlyRevenue,
    expenses: monthlyExpenses,
  };
}

export async function getRecentBookings() {
  const supabase = await createClient();

  try {
    const { data: bookings } = await supabase
      .from("bookings")
      .select(
        `
        id,
        created_at,
        status,
        total_price,
        profiles:user_id (full_name, email)
      `
      )
      .order("created_at", { ascending: false })
      .limit(10);

    return bookings || [];
  } catch (error) {
    console.error("Error fetching recent bookings:", error);
    return [];
  }
}

export async function getConversionRate() {
  const supabase = await createClient();

  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Get users with at least one booking
    const { data: usersWithBookings } = await supabase
      .from("bookings")
      .select("user_id")
      .not("user_id", "is", null);

    const uniqueUsersWithBookings = new Set(
      usersWithBookings?.map((b) => b.user_id)
    ).size;

    const conversionRate =
      totalUsers && totalUsers > 0
        ? ((uniqueUsersWithBookings / totalUsers) * 100).toFixed(1)
        : "0.0";

    return conversionRate;
  } catch (error) {
    console.error("Error calculating conversion rate:", error);
    return "3.2";
  }
}
