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
    const { data: bookings } = await supabase
      .from("bookings")
      .select("total_price, created_at, status")
      .gte("created_at", sevenMonthsAgo.toISOString())
      .in("status", ["confirmed", "completed"])
      .order("created_at", { ascending: true });

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

export async function getVehicleStats() {
  const supabase = await createClient();

  try {
    // Get all active subscription IDs
    const { data: activeSubs } = await supabase
      .from("user_subscription")
      .select("id")
      .eq("status", "active");

    const activeSubIds = (activeSubs || []).map((s: any) => s.id);

    if (activeSubIds.length === 0) {
      return {
        totalVehicles: 0,
        primaryVehicles: 0,
        familyVehicles: 0,
        flockSubscriptions: 0,
        soloSubscriptions: 0,
      };
    }

    // Get all subscription_vehicle rows for active subscriptions
    const { data: subVehicles } = await supabase
      .from("subscription_vehicles")
      .select("subscription_id")
      .in("subscription_id", activeSubIds);

    // Count vehicles per subscription
    const vehiclesPerSub: Record<string, number> = {};
    (subVehicles || []).forEach((sv: any) => {
      vehiclesPerSub[sv.subscription_id] =
        (vehiclesPerSub[sv.subscription_id] || 0) + 1;
    });

    const counts = Object.values(vehiclesPerSub);
    const totalVehicles = counts.reduce((a, b) => a + b, 0);
    const totalSubscriptions = counts.length;
    const flockSubscriptions = counts.filter((c) => c > 1).length;
    const soloSubscriptions = totalSubscriptions - flockSubscriptions;
    // Each subscription has exactly 1 primary; family = the rest
    const familyVehicles = totalVehicles - totalSubscriptions;
    const primaryVehicles = totalSubscriptions;

    return {
      totalVehicles,
      primaryVehicles,
      familyVehicles,
      flockSubscriptions,
      soloSubscriptions,
    };
  } catch (error) {
    console.error("Error fetching vehicle stats:", error);
    return {
      totalVehicles: 0,
      primaryVehicles: 0,
      familyVehicles: 0,
      flockSubscriptions: 0,
      soloSubscriptions: 0,
    };
  }
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

export async function getAddOnStats() {
  const supabase = await createClient();

  try {
    // Fetch all booking_add_ons with add-on details
    const { data: bookingAddOns, error } = await supabase.from(
      "booking_add_ons"
    ).select(`
        add_on_id,
        add_ons (
          id,
          name,
          price
        )
      `);

    if (error) {
      console.error("Error fetching add-on stats:", error);
      return { labels: [], values: [], revenue: [] };
    }

    // Count occurrences of each add-on
    const addOnCounts: Record<
      string,
      { count: number; name: string; revenue: number }
    > = {};

    bookingAddOns?.forEach((item: any) => {
      const addOn = item.add_ons;
      if (addOn) {
        const addOnId = addOn.id;
        if (!addOnCounts[addOnId]) {
          addOnCounts[addOnId] = {
            count: 0,
            name: addOn.name || "Unknown",
            revenue: 0,
          };
        }
        addOnCounts[addOnId].count += 1;
        addOnCounts[addOnId].revenue += Number(addOn.price || 0);
      }
    });

    // Sort by count (most popular first) and get top 10
    const sorted = Object.entries(addOnCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10); // Top 10 most popular add-ons

    return {
      labels: sorted.map(([, data]) => data.name),
      values: sorted.map(([, data]) => data.count),
      revenue: sorted.map(([, data]) => data.revenue),
    };
  } catch (error) {
    console.error("Error fetching add-on stats:", error);
    return { labels: [], values: [], revenue: [] };
  }
}
