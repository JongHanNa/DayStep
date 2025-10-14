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
          task_id: string | null
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
          task_id?: string | null
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
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pomodoro_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "timeline_tasks"
            referencedColumns: ["id"]
          },
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
          linked_timeline_task_id: string | null
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
          linked_timeline_task_id?: string | null
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
          linked_timeline_task_id?: string | null
          position?: number | null
          recurrence_type?: string | null
          related_task_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_memos_linked_timeline_task_id_fkey"
            columns: ["linked_timeline_task_id"]
            isOneToOne: false
            referencedRelation: "timeline_tasks"
            referencedColumns: ["id"]
          },
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
      timeline_tasks: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          planned_end_time: string | null
          planned_start_time: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          planned_end_time?: string | null
          planned_start_time?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          planned_end_time?: string | null
          planned_start_time?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_tasks_user_id_fkey"
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
          content: string
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
          content: string
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
          content?: string
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
      recurrence_pattern_enum: ["none", "daily", "weekly", "monthly", "custom"],
      schedule_type_enum: ["all_day", "timed", "anytime"],
    },
  },
} as const
