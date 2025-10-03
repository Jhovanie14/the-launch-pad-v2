export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  body_type: string | null;
  colors: string | null;
}

export interface Booking {
  id: string;
  user_id: string | null;
  vehicle_id: string | null;
  service_package_id: string | null;
  add_ons_id: string | null;
  service_package_name: string | null;
  service_package_price: string | null; // numeric comes as string from Supabase
  add_ons: AddOn | null;
  appointment_date: string; // ISO string from DB
  appointment_time: string; // e.g. "14:30:00"
  total_price: string; // numeric comes as string
  total_duration: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  notes?: string | null;
  special_instructions?: string | null;
  payment_intent_id?: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  completed_at: string | null;

  // Relation join
  vehicle?: Vehicle | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  provider?: string;
}

export interface SubscriptionPlans {
  id: string;
  name: string;
  description: string;
  month_price: string;
  yearly_price: string;
  features: string[];
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  subscription_plans?: {
    name: string;
    description: string;
    monthly_price: number;
    yearly_price: number;
  };
}

export interface PricingPlan {
  id: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  features: string[];
}

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface OrderData {
  type: "checkout" | "subscription"; // which flow
  date: string; // human-readable date
  orderNumber: string; // Stripe PI id or booking id
  paymentMethod: string; // "Card" | "Subscription"
  items: OrderItem[]; // normalized list of items
  subtotal: number; // sum of items
  tax: number; // Stripe only (0 for subscription)
  total: number; // subtotal + tax
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  bookings: {
    service_package_name: string;
  };
  profiles: {
    full_name: string;
  };
}
interface AddOn {
  name: string;
  price: number;
}
