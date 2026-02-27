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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      care_interactions: {
        Row: {
          created_at: string | null
          description: string | null
          gratitude_note: string | null
          id: string
          interaction_date: string
          interaction_type: string
          meeting_note: string | null
          person_id: string
          recent_news: string | null
          request_from_them: string | null
          request_to_them: string | null
          todo_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gratitude_note?: string | null
          id?: string
          interaction_date: string
          interaction_type: string
          meeting_note?: string | null
          person_id: string
          recent_news?: string | null
          request_from_them?: string | null
          request_to_them?: string | null
          todo_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gratitude_note?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          meeting_note?: string | null
          person_id?: string
          recent_news?: string | null
          request_from_them?: string | null
          request_to_them?: string | null
          todo_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_interactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "cherished_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_interactions_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      cherished_people: {
        Row: {
          created_at: string | null
          departments: string[] | null
          id: string
          interaction_count: number | null
          is_active: boolean | null
          last_interaction_at: string | null
          name: string
          nickname: string | null
          relationships: string[] | null
          roles: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          departments?: string[] | null
          id?: string
          interaction_count?: number | null
          is_active?: boolean | null
          last_interaction_at?: string | null
          name: string
          nickname?: string | null
          relationships?: string[] | null
          roles?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          departments?: string[] | null
          id?: string
          interaction_count?: number | null
          is_active?: boolean | null
          last_interaction_at?: string | null
          name?: string
          nickname?: string | null
          relationships?: string[] | null
          roles?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      note_instances: {
        Row: {
          content: string
          created_at: string
          id: string
          instance_date: string
          is_modified: boolean
          original_note_id: string
          related_task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          instance_date: string
          is_modified?: boolean
          original_note_id: string
          related_task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          instance_date?: string
          is_modified?: boolean
          original_note_id?: string
          related_task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_instances_original_note_id_fkey"
            columns: ["original_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_notes: {
        Row: {
          created_at: string
          id: string
          source_note_id: string
          target_note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_note_id: string
          target_note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_note_id?: string
          target_note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_notes_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_notes_target_note_id_fkey"
            columns: ["target_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_banner_pinned: boolean | null
          is_floating: boolean
          is_pinned: boolean
          is_processed: boolean | null
          is_recurring: boolean | null
          linked_date: string | null
          linked_timeline_task_id: string | null
          note_category:
            | Database["public"]["Enums"]["note_category_enum"]
            | null
          position: number
          recurrence_type: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_banner_pinned?: boolean | null
          is_floating?: boolean
          is_pinned?: boolean
          is_processed?: boolean | null
          is_recurring?: boolean | null
          linked_date?: string | null
          linked_timeline_task_id?: string | null
          note_category?:
            | Database["public"]["Enums"]["note_category_enum"]
            | null
          position?: number
          recurrence_type?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_banner_pinned?: boolean | null
          is_floating?: boolean
          is_pinned?: boolean
          is_processed?: boolean | null
          is_recurring?: boolean | null
          linked_date?: string | null
          linked_timeline_task_id?: string | null
          note_category?:
            | Database["public"]["Enums"]["note_category_enum"]
            | null
          position?: number
          recurrence_type?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pomodoro_sessions: {
        Row: {
          break_duration: number | null
          created_at: string
          distraction_plan: Json | null
          duration: number | null
          end_time: string | null
          id: string
          is_completed: boolean | null
          linked_todo_id: string | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          break_duration?: number | null
          created_at?: string
          distraction_plan?: Json | null
          duration?: number | null
          end_time?: string | null
          id?: string
          is_completed?: boolean | null
          linked_todo_id?: string | null
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          break_duration?: number | null
          created_at?: string
          distraction_plan?: Json | null
          duration?: number | null
          end_time?: string | null
          id?: string
          is_completed?: boolean | null
          linked_todo_id?: string | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      priority_reminders: {
        Row: {
          category: string | null
          created_at: string | null
          display_weight: number | null
          id: string
          is_active: boolean | null
          message_key: string
          message_text: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          display_weight?: number | null
          id?: string
          is_active?: boolean | null
          message_key: string
          message_text: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          display_weight?: number | null
          id?: string
          is_active?: boolean | null
          message_key?: string
          message_text?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          source: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          source?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          source?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          created_at: string | null
          event_timestamp: string | null
          event_type: Database["public"]["Enums"]["subscription_event_type_enum"]
          id: string
          metadata: Json | null
          platform: Database["public"]["Enums"]["platform_enum"]
          product_id: string
          revenue_cat_event_id: string | null
          revenue_cat_transaction_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_timestamp?: string | null
          event_type: Database["public"]["Enums"]["subscription_event_type_enum"]
          id?: string
          metadata?: Json | null
          platform: Database["public"]["Enums"]["platform_enum"]
          product_id: string
          revenue_cat_event_id?: string | null
          revenue_cat_transaction_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_timestamp?: string | null
          event_type?: Database["public"]["Enums"]["subscription_event_type_enum"]
          id?: string
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["platform_enum"]
          product_id?: string
          revenue_cat_event_id?: string | null
          revenue_cat_transaction_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew_enabled: boolean | null
          cancelled_at: string | null
          created_at: string | null
          id: string
          is_legacy_user: boolean | null
          latest_receipt_data: string | null
          legacy_grace_period_end: string | null
          metadata: Json | null
          original_purchase_date: string | null
          platform: Database["public"]["Enums"]["platform_enum"]
          product_id: string
          promo_code: string | null
          promo_discount_percentage: number | null
          promo_duration_months: number | null
          revenue_cat_original_transaction_id: string | null
          revenue_cat_subscriber_id: string | null
          status: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_end_date: string | null
          subscription_start_date: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renew_enabled?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          id?: string
          is_legacy_user?: boolean | null
          latest_receipt_data?: string | null
          legacy_grace_period_end?: string | null
          metadata?: Json | null
          original_purchase_date?: string | null
          platform?: Database["public"]["Enums"]["platform_enum"]
          product_id: string
          promo_code?: string | null
          promo_discount_percentage?: number | null
          promo_duration_months?: number | null
          revenue_cat_original_transaction_id?: string | null
          revenue_cat_subscriber_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renew_enabled?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          id?: string
          is_legacy_user?: boolean | null
          latest_receipt_data?: string | null
          legacy_grace_period_end?: string | null
          metadata?: Json | null
          original_purchase_date?: string | null
          platform?: Database["public"]["Enums"]["platform_enum"]
          product_id?: string
          promo_code?: string | null
          promo_discount_percentage?: number | null
          promo_duration_months?: number | null
          revenue_cat_original_transaction_id?: string | null
          revenue_cat_subscriber_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      todo_completions: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          completed_at: string | null
          completion_date: string
          created_at: string | null
          id: string
          todo_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          completed_at?: string | null
          completion_date: string
          created_at?: string | null
          id?: string
          todo_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          completed_at?: string | null
          completion_date?: string
          created_at?: string | null
          id?: string
          todo_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_completions_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_exclusions: {
        Row: {
          created_at: string | null
          excluded_date: string
          exclusion_reason: string
          id: string
          parent_todo_id: string
          postponed_to_end_time: string | null
          postponed_to_start_time: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          excluded_date: string
          exclusion_reason?: string
          id?: string
          parent_todo_id: string
          postponed_to_end_time?: string | null
          postponed_to_start_time?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          excluded_date?: string
          exclusion_reason?: string
          id?: string
          parent_todo_id?: string
          postponed_to_end_time?: string | null
          postponed_to_start_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_exclusions_parent_todo_id_fkey"
            columns: ["parent_todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_notes: {
        Row: {
          created_at: string
          id: string
          note_id: string
          todo_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          todo_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          todo_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todo_notes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_notes_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_alarms: {
        Row: {
          id: string
          todo_id: string
          user_id: string
          offset_minutes: number
          created_at: string
        }
        Insert: {
          id?: string
          todo_id: string
          user_id: string
          offset_minutes: number
          created_at?: string
        }
        Update: {
          id?: string
          todo_id?: string
          user_id?: string
          offset_minutes?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_alarms_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_alarms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          anytime_duration: number | null
          assigned_date: string | null
          assigned_to: string | null
          color: string | null
          completed: boolean
          created_at: string
          departure_location: string | null
          departure_time: string | null
          end_time: string | null
          icon: string | null
          id: string
          is_relationship_task: boolean | null
          is_today_highlight: boolean
          occurrence_date: string | null
          order_index: number
          original_end_time: string | null
          original_start_time: string | null
          parent_recurring_todo_id: string | null
          parent_todo_id: string | null
          project_id: string | null
          recurrence_count: number | null
          recurrence_day_of_month: number | null
          recurrence_days_of_week: Json | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: Database["public"]["Enums"]["recurrence_pattern_enum"]
          schedule_type: Database["public"]["Enums"]["schedule_type_enum"]
          content: string | null
          alarm_offset_minutes: number | null
          skip_status: string | null
          start_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anytime_duration?: number | null
          assigned_date?: string | null
          assigned_to?: string | null
          color?: string | null
          completed?: boolean
          created_at?: string
          departure_location?: string | null
          departure_time?: string | null
          end_time?: string | null
          icon?: string | null
          id?: string
          is_relationship_task?: boolean | null
          is_today_highlight?: boolean
          occurrence_date?: string | null
          order_index?: number
          original_end_time?: string | null
          original_start_time?: string | null
          parent_recurring_todo_id?: string | null
          parent_todo_id?: string | null
          project_id?: string | null
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: Json | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: Database["public"]["Enums"]["recurrence_pattern_enum"]
          schedule_type?: Database["public"]["Enums"]["schedule_type_enum"]
          content?: string | null
          alarm_offset_minutes?: number | null
          skip_status?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anytime_duration?: number | null
          assigned_date?: string | null
          assigned_to?: string | null
          color?: string | null
          completed?: boolean
          created_at?: string
          departure_location?: string | null
          departure_time?: string | null
          end_time?: string | null
          icon?: string | null
          id?: string
          is_relationship_task?: boolean | null
          is_today_highlight?: boolean
          occurrence_date?: string | null
          order_index?: number
          original_end_time?: string | null
          original_start_time?: string | null
          parent_recurring_todo_id?: string | null
          parent_todo_id?: string | null
          project_id?: string | null
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: Json | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: Database["public"]["Enums"]["recurrence_pattern_enum"]
          schedule_type?: Database["public"]["Enums"]["schedule_type_enum"]
          content?: string | null
          alarm_offset_minutes?: number | null
          skip_status?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_parent_recurring_todo_id_fkey"
            columns: ["parent_recurring_todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_parent_todo_id_fkey"
            columns: ["parent_todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          preference_key: string
          preference_value: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preference_key: string
          preference_value: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preference_key?: string
          preference_value?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage_stats: {
        Row: {
          care_interaction_count: number
          cherished_people_count: number
          contact_count: number
          created_at: string
          habit_count: number
          id: string
          last_calculated_at: string
          todo_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          care_interaction_count?: number
          cherished_people_count?: number
          contact_count?: number
          created_at?: string
          habit_count?: number
          id?: string
          last_calculated_at?: string
          todo_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          care_interaction_count?: number
          cherished_people_count?: number
          contact_count?: number
          created_at?: string
          habit_count?: number
          id?: string
          last_calculated_at?: string
          todo_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          has_active_subscription: boolean | null
          id: string
          name: string | null
          refund_count: number
          subscription_expires_at: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          has_active_subscription?: boolean | null
          id: string
          name?: string | null
          refund_count?: number
          subscription_expires_at?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          has_active_subscription?: boolean | null
          id?: string
          name?: string | null
          refund_count?: number
          subscription_expires_at?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type_enum"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_tag_from_template: {
        Args: {
          p_custom_color?: string
          p_custom_name?: string
          p_template_id: string
          p_user_id: string
        }
        Returns: string
      }
      dev_activate_subscription: { Args: { p_user_id: string }; Returns: Json }
      dev_cancel_subscription: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      initialize_user_usage_stats: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      clarification_enum:
        | "none"
        | "reminder"
        | "someday"
        | "waiting"
        | "next_action"
        | "schedule_clear"
      note_category_enum:
        | "none"
        | "work_in_progress"
        | "read_later"
        | "reference"
        | "inbox"
        | "fuel"
      platform_enum: "ios" | "android" | "web"
      recurrence_pattern_enum:
        | "none"
        | "daily"
        | "weekly"
        | "monthly"
        | "custom"
      schedule_type_enum: "all_day" | "timed" | "anytime" | "none"
      subscription_event_type_enum:
        | "trial_started"
        | "trial_converted"
        | "trial_expired"
        | "subscription_started"
        | "subscription_renewed"
        | "subscription_cancelled"
        | "subscription_expired"
        | "subscription_paused"
        | "subscription_resumed"
        | "product_changed"
        | "refund_issued"
        | "payment_refunded"
        | "billing_issue"
      subscription_status_enum:
        | "trial"
        | "active"
        | "cancelled"
        | "expired"
        | "paused"
      subscription_type_enum: "free" | "pro_monthly" | "pro_yearly"
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
  public: {
    Enums: {
      clarification_enum: [
        "none",
        "reminder",
        "someday",
        "waiting",
        "next_action",
        "schedule_clear",
      ],
      note_category_enum: [
        "none",
        "work_in_progress",
        "read_later",
        "reference",
        "inbox",
        "fuel",
      ],
      platform_enum: ["ios", "android", "web"],
      recurrence_pattern_enum: ["none", "daily", "weekly", "monthly", "custom"],
      schedule_type_enum: ["all_day", "timed", "anytime", "none"],
      subscription_event_type_enum: [
        "trial_started",
        "trial_converted",
        "trial_expired",
        "subscription_started",
        "subscription_renewed",
        "subscription_cancelled",
        "subscription_expired",
        "subscription_paused",
        "subscription_resumed",
        "product_changed",
        "refund_issued",
        "payment_refunded",
        "billing_issue",
      ],
      subscription_status_enum: [
        "trial",
        "active",
        "cancelled",
        "expired",
        "paused",
      ],
      subscription_type_enum: ["free", "pro_monthly", "pro_yearly"],
    },
  },
} as const
