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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          important: boolean | null
          title: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          important?: boolean | null
          title: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          important?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "team_users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_recordings: {
        Row: {
          call_id: string | null
          closer_id: string | null
          duration: number | null
          file_name: string
          file_size: number | null
          file_url: string | null
          id: string
          uploaded_at: string
        }
        Insert: {
          call_id?: string | null
          closer_id?: string | null
          duration?: number | null
          file_name: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          uploaded_at?: string
        }
        Update: {
          call_id?: string | null
          closer_id?: string | null
          duration?: number | null
          file_name?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_recordings_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "closer_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_recordings_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "closers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_products: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          price: number | null
          product_name: string
          sold_date: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          price?: number | null
          product_name: string
          sold_date?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          price?: number | null
          product_name?: string
          sold_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          progress: number | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          progress?: number | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          progress?: number | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          end_date: string | null
          id: string
          installment_amount: number | null
          name: string
          next_due_date: string | null
          notes: string | null
          offer_type: Database["public"]["Enums"]["offer_type"] | null
          paid_installments: number | null
          payment_type: Database["public"]["Enums"]["payment_type"] | null
          phone: string | null
          platform: Database["public"]["Enums"]["payment_platform"] | null
          platform_fee: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          total_installments: number | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          end_date?: string | null
          id?: string
          installment_amount?: number | null
          name: string
          next_due_date?: string | null
          notes?: string | null
          offer_type?: Database["public"]["Enums"]["offer_type"] | null
          paid_installments?: number | null
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          phone?: string | null
          platform?: Database["public"]["Enums"]["payment_platform"] | null
          platform_fee?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          total_installments?: number | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          end_date?: string | null
          id?: string
          installment_amount?: number | null
          name?: string
          next_due_date?: string | null
          notes?: string | null
          offer_type?: Database["public"]["Enums"]["offer_type"] | null
          paid_installments?: number | null
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          phone?: string | null
          platform?: Database["public"]["Enums"]["payment_platform"] | null
          platform_fee?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          total_installments?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      closer_calls: {
        Row: {
          closer_id: string
          created_at: string
          first_call_attended: boolean | null
          first_call_date: string | null
          first_call_status: Database["public"]["Enums"]["call_status"] | null
          id: string
          lead_email: string | null
          lead_name: string
          lead_phone: string | null
          notes: string | null
          objections: string | null
          paid: boolean | null
          price: number | null
          qualified: boolean | null
          rescheduled_date: string | null
          second_call_date: string | null
          second_call_status: Database["public"]["Enums"]["call_status"] | null
          updated_at: string
        }
        Insert: {
          closer_id: string
          created_at?: string
          first_call_attended?: boolean | null
          first_call_date?: string | null
          first_call_status?: Database["public"]["Enums"]["call_status"] | null
          id?: string
          lead_email?: string | null
          lead_name: string
          lead_phone?: string | null
          notes?: string | null
          objections?: string | null
          paid?: boolean | null
          price?: number | null
          qualified?: boolean | null
          rescheduled_date?: string | null
          second_call_date?: string | null
          second_call_status?: Database["public"]["Enums"]["call_status"] | null
          updated_at?: string
        }
        Update: {
          closer_id?: string
          created_at?: string
          first_call_attended?: boolean | null
          first_call_date?: string | null
          first_call_status?: Database["public"]["Enums"]["call_status"] | null
          id?: string
          lead_email?: string | null
          lead_name?: string
          lead_phone?: string | null
          notes?: string | null
          objections?: string | null
          paid?: boolean | null
          price?: number | null
          qualified?: boolean | null
          rescheduled_date?: string | null
          second_call_date?: string | null
          second_call_status?: Database["public"]["Enums"]["call_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closer_calls_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "closers"
            referencedColumns: ["id"]
          },
        ]
      }
      closers: {
        Row: {
          avatar: string | null
          commitment: number | null
          created_at: string
          goal: number | null
          id: string
          name: string
          notes: string | null
          stage: Database["public"]["Enums"]["closer_stage"] | null
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          commitment?: number | null
          created_at?: string
          goal?: number | null
          id?: string
          name: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["closer_stage"] | null
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          commitment?: number | null
          created_at?: string
          goal?: number | null
          id?: string
          name?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["closer_stage"] | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"] | null
          client_id: string | null
          description: string | null
          favorite: boolean | null
          file_content: string | null
          file_type: string | null
          file_url: string | null
          id: string
          name: string
          tags: string[] | null
          upload_date: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"] | null
          client_id?: string | null
          description?: string | null
          favorite?: boolean | null
          file_content?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name: string
          tags?: string[] | null
          upload_date?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"] | null
          client_id?: string | null
          description?: string | null
          favorite?: boolean | null
          file_content?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name?: string
          tags?: string[] | null
          upload_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_costs: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          frequency: string | null
          id: string
          name: string
          payment_date: number | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          name: string
          payment_date?: number | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          name?: string
          payment_date?: number | null
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          date: string
          id: string
          source: string
          type: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          date: string
          id?: string
          source: string
          type?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          source?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incomes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_accounting: {
        Row: {
          created_at: string
          id: string
          month: number
          net_profit: number | null
          notes: string | null
          total_fixed_costs: number | null
          total_income: number | null
          total_variable_costs: number | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          net_profit?: number | null
          notes?: string | null
          total_fixed_costs?: number | null
          total_income?: number | null
          total_variable_costs?: number | null
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          net_profit?: number | null
          notes?: string | null
          total_fixed_costs?: number | null
          total_income?: number | null
          total_variable_costs?: number | null
          year?: number
        }
        Relationships: []
      }
      performance_task_config: {
        Row: {
          category: string
          created_at: string
          custom_label: string
          display_order: number | null
          field_key: string
          id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          custom_label: string
          display_order?: number | null
          field_key: string
          id?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          custom_label?: string
          display_order?: number | null
          field_key?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      setter_meetings: {
        Row: {
          attended: boolean | null
          created_at: string
          id: string
          lead_email: string | null
          lead_name: string
          lead_phone: string | null
          notes: string | null
          scheduled_date: string
          setter_id: string
        }
        Insert: {
          attended?: boolean | null
          created_at?: string
          id?: string
          lead_email?: string | null
          lead_name: string
          lead_phone?: string | null
          notes?: string | null
          scheduled_date: string
          setter_id: string
        }
        Update: {
          attended?: boolean | null
          created_at?: string
          id?: string
          lead_email?: string | null
          lead_name?: string
          lead_phone?: string | null
          notes?: string | null
          scheduled_date?: string
          setter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setter_meetings_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "setters"
            referencedColumns: ["id"]
          },
        ]
      }
      setters: {
        Row: {
          avatar: string | null
          commitment: number | null
          created_at: string
          goal: number | null
          id: string
          name: string
          notes: string | null
          stage: Database["public"]["Enums"]["setter_stage"] | null
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          commitment?: number | null
          created_at?: string
          goal?: number | null
          id?: string
          name: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["setter_stage"] | null
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          commitment?: number | null
          created_at?: string
          goal?: number | null
          id?: string
          name?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["setter_stage"] | null
          updated_at?: string
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          status: Database["public"]["Enums"]["task_status"] | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_availability: {
        Row: {
          id: string
          last_active: string | null
          status: Database["public"]["Enums"]["availability_status"] | null
          timezone: string | null
          updated_at: string
          user_id: string
          work_schedule_end: string | null
          work_schedule_start: string | null
        }
        Insert: {
          id?: string
          last_active?: string | null
          status?: Database["public"]["Enums"]["availability_status"] | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          work_schedule_end?: string | null
          work_schedule_start?: string | null
        }
        Update: {
          id?: string
          last_active?: string | null
          status?: Database["public"]["Enums"]["availability_status"] | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          work_schedule_end?: string | null
          work_schedule_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "team_users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_users: {
        Row: {
          avatar: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      time_audit_tasks: {
        Row: {
          category: string | null
          created_at: string
          delegation_cost: number | null
          energy: string | null
          hours_per_week: string | null
          id: string
          impact: number | null
          knowledge: number | null
          new_owner: string | null
          processes_to_create: string | null
          score: number | null
          task_name: string
          xds: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          delegation_cost?: number | null
          energy?: string | null
          hours_per_week?: string | null
          id?: string
          impact?: number | null
          knowledge?: number | null
          new_owner?: string | null
          processes_to_create?: string | null
          score?: number | null
          task_name: string
          xds?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          delegation_cost?: number | null
          energy?: string | null
          hours_per_week?: string | null
          id?: string
          impact?: number | null
          knowledge?: number | null
          new_owner?: string | null
          processes_to_create?: string | null
          score?: number | null
          task_name?: string
          xds?: string | null
        }
        Relationships: []
      }
      user_performance: {
        Row: {
          accountability: boolean | null
          actual: number | null
          cold_shower: boolean | null
          created_at: string
          custom_1: boolean | null
          custom_10: boolean | null
          custom_2: boolean | null
          custom_3: boolean | null
          custom_4: boolean | null
          custom_5: boolean | null
          custom_6: boolean | null
          custom_7: boolean | null
          custom_8: boolean | null
          custom_9: boolean | null
          daily_planning: boolean | null
          date: string
          desk_order: boolean | null
          exercise: boolean | null
          focus_hours: string | null
          focus_hours_logged: boolean | null
          id: string
          meditation: boolean | null
          mentoring: boolean | null
          morning_routine: boolean | null
          notes: string | null
          program_content: boolean | null
          sleep_time: string | null
          success_tracker: boolean | null
          target: number | null
          time_tracking: boolean | null
          user_id: string
          wake_time: string | null
          weekly_planning: boolean | null
          weekly_tasks_complete: boolean | null
        }
        Insert: {
          accountability?: boolean | null
          actual?: number | null
          cold_shower?: boolean | null
          created_at?: string
          custom_1?: boolean | null
          custom_10?: boolean | null
          custom_2?: boolean | null
          custom_3?: boolean | null
          custom_4?: boolean | null
          custom_5?: boolean | null
          custom_6?: boolean | null
          custom_7?: boolean | null
          custom_8?: boolean | null
          custom_9?: boolean | null
          daily_planning?: boolean | null
          date: string
          desk_order?: boolean | null
          exercise?: boolean | null
          focus_hours?: string | null
          focus_hours_logged?: boolean | null
          id?: string
          meditation?: boolean | null
          mentoring?: boolean | null
          morning_routine?: boolean | null
          notes?: string | null
          program_content?: boolean | null
          sleep_time?: string | null
          success_tracker?: boolean | null
          target?: number | null
          time_tracking?: boolean | null
          user_id: string
          wake_time?: string | null
          weekly_planning?: boolean | null
          weekly_tasks_complete?: boolean | null
        }
        Update: {
          accountability?: boolean | null
          actual?: number | null
          cold_shower?: boolean | null
          created_at?: string
          custom_1?: boolean | null
          custom_10?: boolean | null
          custom_2?: boolean | null
          custom_3?: boolean | null
          custom_4?: boolean | null
          custom_5?: boolean | null
          custom_6?: boolean | null
          custom_7?: boolean | null
          custom_8?: boolean | null
          custom_9?: boolean | null
          daily_planning?: boolean | null
          date?: string
          desk_order?: boolean | null
          exercise?: boolean | null
          focus_hours?: string | null
          focus_hours_logged?: boolean | null
          id?: string
          meditation?: boolean | null
          mentoring?: boolean | null
          morning_routine?: boolean | null
          notes?: string | null
          program_content?: boolean | null
          sleep_time?: string | null
          success_tracker?: boolean | null
          target?: number | null
          time_tracking?: boolean | null
          user_id?: string
          wake_time?: string | null
          weekly_planning?: boolean | null
          weekly_tasks_complete?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_performance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_users"
            referencedColumns: ["id"]
          },
        ]
      }
      variable_costs: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      availability_status: "disponible" | "ocupado" | "ausente" | "vacaciones"
      call_status:
        | "pendiente"
        | "realizada"
        | "no_asistio"
        | "reagendada"
        | "cancelada"
      client_status: "activo" | "pausado" | "finalizado" | "cancelado"
      closer_stage: "nuevo" | "entrenamiento" | "activo" | "senior" | "lider"
      document_category:
        | "contratos"
        | "sops"
        | "comprobantes"
        | "propuestas"
        | "legal"
        | "otros"
      lead_status:
        | "nuevo"
        | "calificado"
        | "no_calificado"
        | "cerrado"
        | "perdido"
      offer_type: "DWY" | "DFY"
      payment_platform: "Stripe" | "Binance" | "Transfer"
      payment_type: "Upfront" | "Mensual" | "Cuotas"
      setter_stage: "nuevo" | "entrenamiento" | "activo" | "senior" | "lider"
      task_priority: "alta" | "media" | "baja"
      task_status: "pendiente" | "en_progreso" | "completada"
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
      availability_status: ["disponible", "ocupado", "ausente", "vacaciones"],
      call_status: [
        "pendiente",
        "realizada",
        "no_asistio",
        "reagendada",
        "cancelada",
      ],
      client_status: ["activo", "pausado", "finalizado", "cancelado"],
      closer_stage: ["nuevo", "entrenamiento", "activo", "senior", "lider"],
      document_category: [
        "contratos",
        "sops",
        "comprobantes",
        "propuestas",
        "legal",
        "otros",
      ],
      lead_status: [
        "nuevo",
        "calificado",
        "no_calificado",
        "cerrado",
        "perdido",
      ],
      offer_type: ["DWY", "DFY"],
      payment_platform: ["Stripe", "Binance", "Transfer"],
      payment_type: ["Upfront", "Mensual", "Cuotas"],
      setter_stage: ["nuevo", "entrenamiento", "activo", "senior", "lider"],
      task_priority: ["alta", "media", "baja"],
      task_status: ["pendiente", "en_progreso", "completada"],
    },
  },
} as const
