import { createClient } from "@/utils/supabase/server";
import { HOLIDAY_SALE_ACTIVE, HOLIDAY_SALE_DISCOUNT } from "@/lib/booking/holidaySale";
import { buildServicesPage, type ServicesPageModel } from "./servicesPage";

/**
 * Server only. The public services page's data, read fresh on every request
 * (public tables, so the visitor's own client is enough). A failed query
 * shows as an empty list for that table rather than breaking the page.
 */
export async function getServicesPageData(): Promise<ServicesPageModel> {
  const db = await createClient();
  const [services, plans] = await Promise.all([
    db
      .from("service_packages")
      .select("id, name, duration, price, features, category")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    db.from("subscription_plans").select("name, monthly_price, is_commercial, is_active"),
  ]);
  if (services.error) console.error("Services page: service lookup failed", services.error);
  if (plans.error) console.error("Services page: plan lookup failed", plans.error);

  return buildServicesPage({
    services: services.data ?? [],
    plans: plans.data ?? [],
    saleActive: HOLIDAY_SALE_ACTIVE,
    saleDiscount: HOLIDAY_SALE_DISCOUNT,
  });
}
