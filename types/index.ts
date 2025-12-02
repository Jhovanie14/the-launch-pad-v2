export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: string | null;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  year: string | null;
  make: string | null;
  model: string | null;
  body_type: string | null;
  colors: string | null;
}

export interface Booking {
  id: string;
  user_id: string | null;
  vehicle_id: string | null;
  service_package_id: string | null;
  service_package_name: string | null;
  service_package_price: string | null; // numeric comes as string from Supabase
  appointment_date: string; // ISO string from DB
  appointment_time: string; // e.g. "14:30:00"
  total_price: string; // numeric comes as string
  total_duration: number;
  payment_method: string;
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
  add_ons: AddOn[];
  // Relation join
  vehicle?: Vehicle | null;
  attendant_name: string | null;
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
  monthly_price: string;
  yearly_price: string;
  features: string[];
  is_active: boolean;
  image_url: string;
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
  cancel_at_period_end: boolean;
  current_period_end: string;
  subscription_plans?: {
    name: string;
    description: string;
    monthly_price: number;
    yearly_price: number;
  };
  vehicles?: Array<{
    id: string;
    year: number;
    make: string;
    model: string;
    body_type?: string;
    colors?: string[];
  }>;
}

// types/selfService.ts
export interface SelfServiceSubscription {
  id: string;
  user_id: string;
  plan_id: string; // maps to self_service_plan_id
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string; // 'active', 'canceled', etc.
  billing_cycle: string; // 'month' | 'year' or custom logic
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  subscription_plans?: {
    name: string;
    description: string;
    monthly_price: number;
  };
  is_active: boolean;
  started_at: string;
  last_used_date?: string | null;
  created_at: string;
  updated_at: string;
  vehicles: Vehicle[];
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
  discountAmount?: number | 0;
  discountPercent?: number | 0;
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
    avatar_url: string;
  };
}
export type AddOn = {
  id: string;
  name: string;
  price: number;
  duration: number;
  is_active: boolean;
  created_at: string | null;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  cover_image: string; // Changed to snake_case to match DB
  published: boolean;
  created_at: string; // Changed to snake_case to match DB
};

export type BlogPostFormData = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  cover_image: string;
  //   tags: string[];
  published: boolean;
};
