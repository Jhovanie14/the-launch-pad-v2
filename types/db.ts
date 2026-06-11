// Convenience aliases over the generated Supabase types.
// Prefer these in app code instead of `any` for table row/insert/update shapes.
import type { Database } from "@/types/database.types";

export type Tables = Database["public"]["Tables"];

export type BookingRow = Tables["bookings"]["Row"];
export type BookingInsert = Tables["bookings"]["Insert"];
export type BookingUpdate = Tables["bookings"]["Update"];

export type VehicleRow = Tables["vehicles"]["Row"];
export type ServicePackageRow = Tables["service_packages"]["Row"];
export type AddOnRow = Tables["add_ons"]["Row"];
export type BookingAddOnRow = Tables["booking_add_ons"]["Row"];

export type UserSubscriptionRow = Tables["user_subscription"]["Row"];
export type SubscriptionPlanRow = Tables["subscription_plans"]["Row"];
export type SubscriptionVehicleRow = Tables["subscription_vehicles"]["Row"];

export type SelfServiceSubscriptionRow = Tables["self_service_subscriptions"]["Row"];
export type SelfServicePlanRow = Tables["self_service_plans"]["Row"];

export type ProfileRow = Tables["profiles"]["Row"];
export type PromoCodeRow = Tables["promo_codes"]["Row"];
export type ReviewRow = Tables["reviews"]["Row"];
