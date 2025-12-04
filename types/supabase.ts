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
      areas_resources: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_pinned: boolean
          order_index: number
          status: Database["public"]["Enums"]["area_resource_status_enum"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_pinned?: boolean
          order_index?: number
          status?: Database["public"]["Enums"]["area_resource_status_enum"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_pinned?: boolean
          order_index?: number
          status?: Database["public"]["Enums"]["area_resource_status_enum"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          id: string
          is_from_device: boolean | null
          job_title: string | null
          last_contact_date: string | null
          name: string
          notes: string | null
          relationship: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          id?: string
          is_from_device?: boolean | null
          job_title?: string | null
          last_contact_date?: string | null
          name: string
          notes?: string | null
          relationship?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          id?: string
          is_from_device?: boolean | null
          job_title?: string | null
          last_contact_date?: string | null
          name?: string
          notes?: string | null
          relationship?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          area_id: string | null
          area_resource_id: string | null
          color: string | null
          created_at: string
          end_date: string | null
          icon: string | null
          id: string
          order_index: number
          quarter_goal: Database["public"]["Enums"]["quarter_enum"] | null
          resource_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["progress_status_enum"]
          title: string
          updated_at: string
          user_id: string
          year_goal: number | null
        }
        Insert: {
          area_id?: string | null
          area_resource_id?: string | null
          color?: string | null
          created_at?: string
          end_date?: string | null
          icon?: string | null
          id?: string
          order_index?: number
          quarter_goal?: Database["public"]["Enums"]["quarter_enum"] | null
          resource_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["progress_status_enum"]
          title: string
          updated_at?: string
          user_id: string
          year_goal?: number | null
        }
        Update: {
          area_id?: string | null
          area_resource_id?: string | null
          color?: string | null
          created_at?: string
          end_date?: string | null
          icon?: string | null
          id?: string
          order_index?: number
          quarter_goal?: Database["public"]["Enums"]["quarter_enum"] | null
          resource_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["progress_status_enum"]
          title?: string
          updated_at?: string
          user_id?: string
          year_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area_resource_note_counts"
            referencedColumns: ["area_resource_id"]
          },
          {
            foreignKeyName: "goals_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_area_resource_id_fkey"
            columns: ["area_resource_id"]
            isOneToOne: false
            referencedRelation: "area_resource_note_counts"
            referencedColumns: ["area_resource_id"]
          },
          {
            foreignKeyName: "goals_area_resource_id_fkey"
            columns: ["area_resource_id"]
            isOneToOne: false
            referencedRelation: "areas_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "area_resource_note_counts"
            referencedColumns: ["area_resource_id"]
          },
          {
            foreignKeyName: "goals_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "areas_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      note_instances: {
        Row: {
          content: string
          created_at: string | null
          id: string
          instance_date: string
          is_modified: boolean | null
          original_note_id: string | null
          related_task_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          instance_date: string
          is_modified?: boolean | null
          original_note_id?: string | null
          related_task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          instance_date?: string
          is_modified?: boolean | null
          original_note_id?: string | null
          related_task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_instances_original_note_id_fkey"
            columns: ["original_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_instances_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "todos"
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
        }
        Insert: {
          created_at?: string
          id?: string
          source_note_id: string
          target_note_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_note_id?: string
          target_note_id?: string
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
          area_resource_id: string | null
          content: string
          created_at: string | null
          id: string
          is_floating: boolean | null
          is_pinned: boolean | null
          is_recurring: boolean | null
          linked_date: string | null
          note_category: Database["public"]["Enums"]["note_category_enum"]
          position: number | null
          recurrence_type: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          area_resource_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_floating?: boolean | null
          is_pinned?: boolean | null
          is_recurring?: boolean | null
          linked_date?: string | null
          note_category?: Database["public"]["Enums"]["note_category_enum"]
          position?: number | null
          recurrence_type?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          area_resource_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_floating?: boolean | null
          is_pinned?: boolean | null
          is_recurring?: boolean | null
          linked_date?: string | null
          note_category?: Database["public"]["Enums"]["note_category_enum"]
          position?: number | null
          recurrence_type?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_area_resource_id_fkey"
            columns: ["area_resource_id"]
            isOneToOne: false
            referencedRelation: "area_resource_note_counts"
            referencedColumns: ["area_resource_id"]
          },
          {
            foreignKeyName: "notes_area_resource_id_fkey"
            columns: ["area_resource_id"]
            isOneToOne: false
            referencedRelation: "areas_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_sessions: {
        Row: {
          break_duration: number | null
          created_at: string
          duration: number | null
          end_time: string | null
          id: string
          is_completed: boolean | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          break_duration?: number | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          id?: string
          is_completed?: boolean | null
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          break_duration?: number | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          id?: string
          is_completed?: boolean | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pomodoro_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          created_at: string
          id: string
          note_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_todo_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          area_resource_id: string | null
          color: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          end_date: string | null
          goal_id: string | null
          icon: string | null
          id: string
          is_completed: boolean
          order_index: number
          start_date: string | null
          status: Database["public"]["Enums"]["progress_status_enum"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_resource_id?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goal_id?: string | null
          icon?: string | null
          id?: string
          is_completed?: boolean
          order_index?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["progress_status_enum"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_resource_id?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goal_id?: string | null
          icon?: string | null
          id?: string
          is_completed?: boolean
          order_index?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["progress_status_enum"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_area_resource_id_fkey"
            columns: ["area_resource_id"]
            isOneToOne: false
            referencedRelation: "area_resource_note_counts"
            referencedColumns: ["area_resource_id"]
          },
          {
            foreignKeyName: "projects_area_resource_id_fkey"
            columns: ["area_resource_id"]
            isOneToOne: false
            referencedRelation: "areas_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_project_stats"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "projects_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      review_checklist_items: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_default: boolean | null
          label: string
          section: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_default?: boolean | null
          label: string
          section: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_default?: boolean | null
          label?: string
          section?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      review_checklist_state: {
        Row: {
          checked_at: string | null
          checklist_item_id: string | null
          created_at: string | null
          id: string
          is_checked: boolean | null
          reset_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          checked_at?: string | null
          checklist_item_id?: string | null
          created_at?: string | null
          id?: string
          is_checked?: boolean | null
          reset_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          checked_at?: string | null
          checklist_item_id?: string | null
          created_at?: string | null
          id?: string
          is_checked?: boolean | null
          reset_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_checklist_state_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "review_checklist_items"
            referencedColumns: ["id"]
          },
        ]
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
          completed_at: string | null
          completion_date: string
          created_at: string | null
          id: string
          todo_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_date: string
          created_at?: string | null
          id?: string
          todo_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
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
      todo_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          relation_type: string | null
          todo_id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          relation_type?: string | null
          todo_id: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          relation_type?: string | null
          todo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_contacts_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_exclusions: {
        Row: {
          created_at: string | null
          excluded_date: string
          id: string
          parent_todo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          excluded_date: string
          id?: string
          parent_todo_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          excluded_date?: string
          id?: string
          parent_todo_id?: string
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
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          todo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          todo_id?: string
          user_id?: string
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
      todo_projects: {
        Row: {
          created_at: string
          id: string
          project_id: string
          todo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          todo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          todo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_todo_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "todo_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_projects_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_time_overrides: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          override_date: string
          parent_todo_id: string
          start_time: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          override_date: string
          parent_todo_id: string
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          override_date?: string
          parent_todo_id?: string
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_time_overrides_parent_todo_id_fkey"
            columns: ["parent_todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          anytime_duration: number | null
          assigned_date: string | null
          assigned_to: string | null
          clarification: Database["public"]["Enums"]["clarification_enum"]
          color: string | null
          completed: boolean
          created_at: string
          departure_location: string | null
          departure_time: string | null
          end_time: string | null
          icon: string | null
          id: string
          is_today_highlight: boolean
          next_action_context_ids: string[] | null
          order_index: number
          parent_todo_id: string | null
          priority: string | null
          recurrence_count: number | null
          recurrence_day_of_month: number | null
          recurrence_days_of_week: Json | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: Database["public"]["Enums"]["recurrence_pattern_enum"]
          schedule_type: Database["public"]["Enums"]["schedule_type_enum"]
          start_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anytime_duration?: number | null
          assigned_date?: string | null
          assigned_to?: string | null
          clarification?: Database["public"]["Enums"]["clarification_enum"]
          color?: string | null
          completed?: boolean
          created_at?: string
          departure_location?: string | null
          departure_time?: string | null
          end_time?: string | null
          icon?: string | null
          id?: string
          is_today_highlight?: boolean
          next_action_context_ids?: string[] | null
          order_index?: number
          parent_todo_id?: string | null
          priority?: string | null
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: Json | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: Database["public"]["Enums"]["recurrence_pattern_enum"]
          schedule_type?: Database["public"]["Enums"]["schedule_type_enum"]
          start_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anytime_duration?: number | null
          assigned_date?: string | null
          assigned_to?: string | null
          clarification?: Database["public"]["Enums"]["clarification_enum"]
          color?: string | null
          completed?: boolean
          created_at?: string
          departure_location?: string | null
          departure_time?: string | null
          end_time?: string | null
          icon?: string | null
          id?: string
          is_today_highlight?: boolean
          next_action_context_ids?: string[] | null
          order_index?: number
          parent_todo_id?: string | null
          priority?: string | null
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: Json | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: Database["public"]["Enums"]["recurrence_pattern_enum"]
          schedule_type?: Database["public"]["Enums"]["schedule_type_enum"]
          start_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_parent_todo_id_fkey"
            columns: ["parent_todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
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
      users: {
        Row: {
          created_at: string
          email: string
          has_active_subscription: boolean | null
          id: string
          name: string | null
          subscription_expires_at: string | null
          subscription_type:
            | Database["public"]["Enums"]["subscription_type_enum"]
            | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          has_active_subscription?: boolean | null
          id: string
          name?: string | null
          subscription_expires_at?: string | null
          subscription_type?:
            | Database["public"]["Enums"]["subscription_type_enum"]
            | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          has_active_subscription?: boolean | null
          id?: string
          name?: string | null
          subscription_expires_at?: string | null
          subscription_type?:
            | Database["public"]["Enums"]["subscription_type_enum"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      area_resource_note_counts: {
        Row: {
          area_resource_id: string | null
          note_count: number | null
          status:
            | Database["public"]["Enums"]["area_resource_status_enum"]
            | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
      goal_project_stats: {
        Row: {
          completed_projects: number | null
          completion_rate: number | null
          goal_id: string | null
          in_progress_projects: number | null
          not_started_projects: number | null
          paused_projects: number | null
          total_projects: number | null
          user_id: string | null
        }
        Relationships: []
      }
      project_todo_stats: {
        Row: {
          completed_todos: number | null
          completion_rate: number | null
          project_id: string | null
          remaining_todos: number | null
          total_todos: number | null
          user_id: string | null
        }
        Relationships: []
      }
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
    }
    Enums: {
      area_resource_status_enum: "area" | "resource" | "archived"
      clarification_enum:
        | "none"
        | "reminder"
        | "someday"
        | "waiting"
        | "next_action"
        | "schedule_clear"
      next_action_context_enum:
        | "creativity"
        | "simple_work"
        | "low_battery"
        | "smartphone"
        | "computer"
        | "home"
        | "outside"
        | "anywhere"
        | "office"
        | "read_later"
      note_category_enum:
        | "none"
        | "work_in_progress"
        | "read_later"
        | "reference"
      platform_enum: "ios" | "android" | "web"
      progress_status_enum:
        | "not_started"
        | "in_progress"
        | "paused"
        | "completed"
      quarter_enum: "Q1" | "Q2" | "Q3" | "Q4"
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
        | "billing_issue"
      subscription_status_enum:
        | "trial"
        | "active"
        | "cancelled"
        | "expired"
        | "paused"
      subscription_type_enum: "free" | "trial" | "pro_monthly" | "pro_yearly"
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
      area_resource_status_enum: ["area", "resource", "archived"],
      clarification_enum: [
        "none",
        "reminder",
        "someday",
        "waiting",
        "next_action",
        "schedule_clear",
      ],
      next_action_context_enum: [
        "creativity",
        "simple_work",
        "low_battery",
        "smartphone",
        "computer",
        "home",
        "outside",
        "anywhere",
        "office",
        "read_later",
      ],
      note_category_enum: [
        "none",
        "work_in_progress",
        "read_later",
        "reference",
      ],
      platform_enum: ["ios", "android", "web"],
      progress_status_enum: [
        "not_started",
        "in_progress",
        "paused",
        "completed",
      ],
      quarter_enum: ["Q1", "Q2", "Q3", "Q4"],
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
        "billing_issue",
      ],
      subscription_status_enum: [
        "trial",
        "active",
        "cancelled",
        "expired",
        "paused",
      ],
      subscription_type_enum: ["free", "trial", "pro_monthly", "pro_yearly"],
    },
  },
} as const
