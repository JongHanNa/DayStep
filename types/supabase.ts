// 🔄 Auto-generated file - Do not edit manually
// Run `npm run supabase:types` to regenerate this file after database schema changes
// This file will be automatically updated to reflect the current database structure

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      memo_instances: {
        Row: {
          content: string
          created_at: string | null
          id: string
          instance_date: string
          is_modified: boolean | null
          original_memo_id: string | null
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
          original_memo_id?: string | null
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
          original_memo_id?: string | null
          related_task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memo_instances_original_memo_id_fkey"
            columns: ["original_memo_id"]
            isOneToOne: false
            referencedRelation: "quick_memos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memo_instances_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      memo_tag_links: {
        Row: {
          assigned_at: string
          id: string
          is_active: boolean
          memo_id: string
          tag_id: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          is_active?: boolean
          memo_id: string
          tag_id?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          is_active?: boolean
          memo_id?: string
          tag_id?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memo_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "memo_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memo_tag_links_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "memo_tag_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      memo_tag_templates: {
        Row: {
          category: string
          color: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          category?: string
          color: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      memo_tags: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_predefined: boolean | null
          is_system_derived: boolean | null
          name: string
          position: number
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_predefined?: boolean | null
          is_system_derived?: boolean | null
          name: string
          position?: number
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_predefined?: boolean | null
          is_system_derived?: boolean | null
          name?: string
          position?: number
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memo_tags_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "memo_tag_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      motivation_tags: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          is_default: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          icon: string
          id: string
          is_default?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      motivation_templates: {
        Row: {
          content: string
          created_at: string | null
          difficulty: string | null
          icon: string
          id: string
          image_url: string | null
          tags: Json
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          difficulty?: string | null
          icon: string
          id: string
          image_url?: string | null
          tags?: Json
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          difficulty?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          tags?: Json
          updated_at?: string | null
        }
        Relationships: []
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
      quick_memos: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_floating: boolean | null
          is_pinned: boolean | null
          is_recurring: boolean | null
          linked_date: string | null
          position: number | null
          recurrence_type: string | null
          related_task_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_floating?: boolean | null
          is_pinned?: boolean | null
          is_recurring?: boolean | null
          linked_date?: string | null
          position?: number | null
          recurrence_type?: string | null
          related_task_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_floating?: boolean | null
          is_pinned?: boolean | null
          is_recurring?: boolean | null
          linked_date?: string | null
          position?: number | null
          recurrence_type?: string | null
          related_task_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_memos_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          estimated_duration: number | null
          id: string
          is_public: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_duration?: number | null
          id?: string
          is_public?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_duration?: number | null
          id?: string
          is_public?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      todo_motivation_links: {
        Row: {
          assigned_at: string | null
          id: string
          is_active: boolean | null
          motivation_id: string
          motivation_type: string
          todo_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          is_active?: boolean | null
          motivation_id: string
          motivation_type: string
          todo_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          is_active?: boolean | null
          motivation_id?: string
          motivation_type?: string
          todo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_motivation_links_todo_id_fkey"
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
          color: string | null
          completed: boolean
          created_at: string
          departure_location: string | null
          departure_time: string | null
          end_time: string | null
          icon: string | null
          id: string
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
          color?: string | null
          completed?: boolean
          created_at?: string
          departure_location?: string | null
          departure_time?: string | null
          end_time?: string | null
          icon?: string | null
          id?: string
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
          color?: string | null
          completed?: boolean
          created_at?: string
          departure_location?: string | null
          departure_time?: string | null
          end_time?: string | null
          icon?: string | null
          id?: string
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
      user_motivation_messages: {
        Row: {
          color: string | null
          content: string
          created_at: string | null
          icon: string
          id: string
          image_url: string | null
          tags: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string | null
          icon: string
          id?: string
          image_url?: string | null
          tags?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          tags?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_tags_for_user: {
        Args: { p_user_id: string }
        Returns: number
      }
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
      recurrence_pattern_enum:
        | "none"
        | "daily"
        | "weekly"
        | "monthly"
        | "custom"
      schedule_type_enum: "all_day" | "timed" | "anytime"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[keyof Database]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
