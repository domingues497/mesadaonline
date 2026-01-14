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
  public: {
    Tables: {
      daughters: {
        Row: {
          id: string
          monthly_allowance_cents: number
          rewards_enabled: boolean | null
        }
        Insert: {
          id: string
          monthly_allowance_cents?: number
          rewards_enabled?: boolean | null
        }
        Update: {
          id?: string
          monthly_allowance_cents?: number
          rewards_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "daughters_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_daughters_profile"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string | null
          display_name: string
          email: string
          expires_at: string
          family_id: string
          id: string
          role: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          email: string
          expires_at?: string
          family_id: string
          id?: string
          role?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          role?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          family_id: string
          id: string
          phone: string | null
          role: string
          username: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          family_id: string
          id: string
          phone?: string | null
          role: string
          username?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          family_id?: string
          id?: string
          phone?: string | null
          role?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          family_id: string
          id: string
          penalty_on_miss: boolean | null
          reminder_whatsapp: boolean | null
          weekly_close_weekday: number | null
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          penalty_on_miss?: boolean | null
          reminder_whatsapp?: boolean | null
          weekly_close_weekday?: number | null
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          penalty_on_miss?: boolean | null
          reminder_whatsapp?: boolean | null
          weekly_close_weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          proof_url: string | null
          status: string
          submitted_by: string
          task_instance_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          proof_url?: string | null
          status?: string
          submitted_by: string
          task_instance_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          proof_url?: string | null
          status?: string
          submitted_by?: string
          task_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      task_instances: {
        Row: {
          created_at: string
          daughter_id: string
          due_date: string
          id: string
          status: string
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daughter_id: string
          due_date: string
          id?: string
          status?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daughter_id?: string
          due_date?: string
          id?: string
          status?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_instances_daughter_id_fkey"
            columns: ["daughter_id"]
            isOneToOne: false
            referencedRelation: "daughters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          active: boolean | null
          attachment_required: boolean | null
          created_at: string
          description: string | null
          family_id: string
          id: string
          recurrence: string
          title: string
          value_cents: number
        }
        Insert: {
          active?: boolean | null
          attachment_required?: boolean | null
          created_at?: string
          description?: string | null
          family_id: string
          id?: string
          recurrence?: string
          title: string
          value_cents?: number
        }
        Update: {
          active?: boolean | null
          attachment_required?: boolean | null
          created_at?: string
          description?: string | null
          family_id?: string
          id?: string
          recurrence?: string
          title?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          created_at: string
          daughter_id: string
          id: string
          kind: string
          memo: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          daughter_id: string
          id?: string
          kind: string
          memo?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          daughter_id?: string
          id?: string
          kind?: string
          memo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_daughter_id_fkey"
            columns: ["daughter_id"]
            isOneToOne: false
            referencedRelation: "daughters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_parent_role: { Args: { family_id_param: string }; Returns: boolean }
      create_daughter_profile: {
        Args: {
          display_name: string
          family_id: string
          monthly_allowance_cents?: number
          phone?: string
          user_id: string
        }
        Returns: string
      }
      create_family_and_parent: {
        Args: {
          family_name: string
          parent_display_name: string
          parent_phone?: string
        }
        Returns: string
      }
      current_family_id: { Args: never; Returns: string }
      get_user_family_id: { Args: never; Returns: string }
      is_family_parent: { Args: { _family_id: string }; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
