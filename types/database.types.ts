export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      add_ons: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          id: string
          is_active: boolean | null
          name: string | null
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          price?: number
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          content: string | null
          cover_image: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          published: boolean | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published?: boolean | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      booking_add_ons: {
        Row: {
          add_on_id: string
          booking_id: string
        }
        Insert: {
          add_on_id: string
          booking_id: string
        }
        Update: {
          add_on_id?: string
          booking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_add_ons_add_on_id_fkey"
            columns: ["add_on_id"]
            isOneToOne: false
            referencedRelation: "add_ons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_add_ons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          appointment_date: string
          appointment_time: string
          attendant_name: string | null
          canceled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          payment_intent_id: string | null
          payment_method: string | null
          service_package_id: string | null
          service_package_name: string | null
          service_package_price: number | null
          special_instructions: string | null
          status: string
          total_duration: number
          total_price: number
          updated_at: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          attendant_name?: string | null
          canceled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          service_package_id?: string | null
          service_package_name?: string | null
          service_package_price?: number | null
          special_instructions?: string | null
          status?: string
          total_duration: number
          total_price: number
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          attendant_name?: string | null
          canceled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          service_package_id?: string | null
          service_package_name?: string | null
          service_package_price?: number | null
          special_instructions?: string | null
          status?: string
          total_duration?: number
          total_price?: number
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_package_id_fkey"
            columns: ["service_package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          concern: string
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          message: string
          phone: string | null
          replied_at: string | null
          status: string | null
          sub_concern: string | null
        }
        Insert: {
          concern: string
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          message: string
          phone?: string | null
          replied_at?: string | null
          status?: string | null
          sub_concern?: string | null
        }
        Update: {
          concern?: string
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          message?: string
          phone?: string | null
          replied_at?: string | null
          status?: string | null
          sub_concern?: string | null
        }
        Relationships: []
      }
      fleet_contracts: {
        Row: {
          company_name: string
          contact_name: string
          contract_type: string
          created_at: string
          discount_percentage: number | null
          email: string
          end_date: string | null
          fleet_size: string
          id: string
          inquiry_id: string | null
          monthly_rate: number
          notes: string | null
          payment_terms: string | null
          phone: string
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_name: string
          contract_type: string
          created_at?: string
          discount_percentage?: number | null
          email: string
          end_date?: string | null
          fleet_size: string
          id?: string
          inquiry_id?: string | null
          monthly_rate: number
          notes?: string | null
          payment_terms?: string | null
          phone: string
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_name?: string
          contract_type?: string
          created_at?: string
          discount_percentage?: number | null
          email?: string
          end_date?: string | null
          fleet_size?: string
          id?: string
          inquiry_id?: string | null
          monthly_rate?: number
          notes?: string | null
          payment_terms?: string | null
          phone?: string
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_contracts_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "fleet_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_inquiries: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          email: string
          fleet_size: string
          id: string
          message: string
          phone: string
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          fleet_size: string
          id?: string
          message: string
          phone: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          fleet_size?: string
          id?: string
          message?: string
          phone?: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fleet_invoices: {
        Row: {
          amount: number
          company_name: string
          contract_id: string
          created_at: string
          due_date: string
          hosted_invoice_url: string | null
          id: string
          invoice_number: string
          invoice_pdf_url: string | null
          issue_date: string
          notes: string | null
          payment_date: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
        }
        Insert: {
          amount: number
          company_name: string
          contract_id: string
          created_at?: string
          due_date: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_number: string
          invoice_pdf_url?: string | null
          issue_date: string
          notes?: string | null
          payment_date?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
        }
        Update: {
          amount?: number
          company_name?: string
          contract_id?: string
          created_at?: string
          due_date?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string
          invoice_pdf_url?: string | null
          issue_date?: string
          notes?: string | null
          payment_date?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "fleet_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_stripe_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          subscribed: boolean | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          subscribed?: boolean | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          subscribed?: boolean | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_type?: string | null
        }
        Relationships: []
      }
      promo_code_redemptions: {
        Row: {
          customer_email: string | null
          id: number
          promo_code_id: number | null
          redeemed_at: string
          user_id: string | null
        }
        Insert: {
          customer_email?: string | null
          id?: number
          promo_code_id?: number | null
          redeemed_at?: string
          user_id?: string | null
        }
        Update: {
          customer_email?: string | null
          id?: number
          promo_code_id?: number | null
          redeemed_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          applies_to: string | null
          code: string | null
          created_at: string
          discount_amount: number | null
          discount_percent: number | null
          discount_type: string
          expires_at: string | null
          id: number
          is_active: boolean | null
          max_uses: number | null
          restricted_to_service: string | null
          used_count: number
        }
        Insert: {
          applies_to?: string | null
          code?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_percent?: number | null
          discount_type?: string
          expires_at?: string | null
          id?: number
          is_active?: boolean | null
          max_uses?: number | null
          restricted_to_service?: string | null
          used_count?: number
        }
        Update: {
          applies_to?: string | null
          code?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_percent?: number | null
          discount_type?: string
          expires_at?: string | null
          id?: number
          is_active?: boolean | null
          max_uses?: number | null
          restricted_to_service?: string | null
          used_count?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      self_service_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          monthly_price: number
          name: string
          stripe_price_id_monthly: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          monthly_price: number
          name: string
          stripe_price_id_monthly?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          name?: string
          stripe_price_id_monthly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      self_service_subscription_vehicles: {
        Row: {
          created_at: string
          id: string
          subscription_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_service_subscription_vehicles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "self_service_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_service_subscription_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      self_service_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_active: boolean
          last_used_date: string | null
          self_service_plan_id: string
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_active?: boolean
          last_used_date?: string | null
          self_service_plan_id: string
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_active?: boolean
          last_used_date?: string | null
          self_service_plan_id?: string
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_service_subscriptions_self_service_plan_id_fkey"
            columns: ["self_service_plan_id"]
            isOneToOne: false
            referencedRelation: "self_service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      self_service_usage_logs: {
        Row: {
          attendant_name: string | null
          check_in_time: string
          check_out_time: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          subscription_id: string
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          attendant_name?: string | null
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          subscription_id: string
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          attendant_name?: string | null
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_service_usage_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "self_service_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_service_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_service_usage_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          duration: number
          features: string[] | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          duration: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          duration?: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          monthly_price: number
          name: string
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
          yearly_price: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          monthly_price: number
          name: string
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
          yearly_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          monthly_price?: number
          name?: string
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
          yearly_price?: number | null
        }
        Relationships: []
      }
      subscription_vehicles: {
        Row: {
          created_at: string
          id: string
          stripe_item_id: string | null
          subscription_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stripe_item_id?: string | null
          subscription_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stripe_item_id?: string | null
          subscription_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_vehicles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscription"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscription: {
        Row: {
          billing_cycle: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          price_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_plan_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscription_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscription_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          body_type: string | null
          colors: string[] | null
          created_at: string | null
          id: string
          license_plate: string | null
          make: string | null
          model: string | null
          trim: string | null
          updated_at: string | null
          user_id: string | null
          year: number | null
        }
        Insert: {
          body_type?: string | null
          colors?: string[] | null
          created_at?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          trim?: string | null
          updated_at?: string | null
          user_id?: string | null
          year?: number | null
        }
        Update: {
          body_type?: string | null
          colors?: string[] | null
          created_at?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          trim?: string | null
          updated_at?: string | null
          user_id?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      booking_counts: {
        Row: {
          service_package_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_package_id_fkey"
            columns: ["service_package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_user_exists: { Args: { email_to_check: string }; Returns: boolean }
      generate_invoice_number: { Args: never; Returns: string }
      increment_promo_used_count: {
        Args: { promo_id: number }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
