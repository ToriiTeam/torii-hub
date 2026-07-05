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
      ads_campanas: {
        Row: {
          ad_account_id: string | null
          campaign_id: string | null
          client_id: string | null
          created_at: string | null
          cuenta_ads: string | null
          estado: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          notas: string | null
          objetivo: string | null
          plataforma: string | null
          presupuesto_diario: number | null
          presupuesto_total: number | null
          updated_at: string | null
        }
        Insert: {
          ad_account_id?: string | null
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          cuenta_ads?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          notas?: string | null
          objetivo?: string | null
          plataforma?: string | null
          presupuesto_diario?: number | null
          presupuesto_total?: number | null
          updated_at?: string | null
        }
        Update: {
          ad_account_id?: string | null
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          cuenta_ads?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          objetivo?: string | null
          plataforma?: string | null
          presupuesto_diario?: number | null
          presupuesto_total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_campanas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_leads: {
        Row: {
          asistio: boolean | null
          calificado: boolean | null
          campana_id: string
          cerrado: boolean | null
          client_id: string | null
          created_at: string | null
          email: string | null
          estado: string | null
          fecha_lead: string | null
          id: string
          monto: number | null
          nombre: string | null
          notas: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          asistio?: boolean | null
          calificado?: boolean | null
          campana_id: string
          cerrado?: boolean | null
          client_id?: string | null
          created_at?: string | null
          email?: string | null
          estado?: string | null
          fecha_lead?: string | null
          id?: string
          monto?: number | null
          nombre?: string | null
          notas?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          asistio?: boolean | null
          calificado?: boolean | null
          campana_id?: string
          cerrado?: boolean | null
          client_id?: string | null
          created_at?: string | null
          email?: string | null
          estado?: string | null
          fecha_lead?: string | null
          id?: string
          monto?: number | null
          nombre?: string | null
          notas?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_leads_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "ads_campanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_metricas_diarias: {
        Row: {
          alcance: number | null
          asistencia: number | null
          calificados: number | null
          campana_id: string
          cerrados: number | null
          clics: number | null
          conversiones: number | null
          cpa: number | null
          cpbc: number | null
          cpc: number | null
          cpl: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          fecha: string
          id: string
          impresiones: number | null
          inversion: number | null
          leads: number | null
          notas: string | null
          typeforms: number | null
          typeforms_calificados: number | null
        }
        Insert: {
          alcance?: number | null
          asistencia?: number | null
          calificados?: number | null
          campana_id: string
          cerrados?: number | null
          clics?: number | null
          conversiones?: number | null
          cpa?: number | null
          cpbc?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          fecha: string
          id?: string
          impresiones?: number | null
          inversion?: number | null
          leads?: number | null
          notas?: string | null
          typeforms?: number | null
          typeforms_calificados?: number | null
        }
        Update: {
          alcance?: number | null
          asistencia?: number | null
          calificados?: number | null
          campana_id?: string
          cerrados?: number | null
          clics?: number | null
          conversiones?: number | null
          cpa?: number | null
          cpbc?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          fecha?: string
          id?: string
          impresiones?: number | null
          inversion?: number | null
          leads?: number | null
          notas?: string | null
          typeforms?: number | null
          typeforms_calificados?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_metricas_diarias_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "ads_campanas"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          accion_tomada: string | null
          client_id: string | null
          created_at: string | null
          descripcion: string
          estado: string | null
          fecha_apertura: string | null
          fecha_cierre: string | null
          id: string
          prioridad: number | null
          responsable: string | null
          semaforo: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          accion_tomada?: string | null
          client_id?: string | null
          created_at?: string | null
          descripcion: string
          estado?: string | null
          fecha_apertura?: string | null
          fecha_cierre?: string | null
          id?: string
          prioridad?: number | null
          responsable?: string | null
          semaforo?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          accion_tomada?: string | null
          client_id?: string | null
          created_at?: string | null
          descripcion?: string
          estado?: string | null
          fecha_apertura?: string | null
          fecha_cierre?: string | null
          id?: string
          prioridad?: number | null
          responsable?: string | null
          semaforo?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      angles: {
        Row: {
          client_id: string | null
          created_at: string | null
          drive_folder_id: string | null
          hipotesis_activa: string | null
          id: string
          narrativa: string | null
          nombre: string | null
          pipeline_stage: string | null
          resultado: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          drive_folder_id?: string | null
          hipotesis_activa?: string | null
          id?: string
          narrativa?: string | null
          nombre?: string | null
          pipeline_stage?: string | null
          resultado?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          drive_folder_id?: string | null
          hipotesis_activa?: string | null
          id?: string
          narrativa?: string | null
          nombre?: string | null
          pipeline_stage?: string | null
          resultado?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "angles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
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
      bottlenecks: {
        Row: {
          client_id: string | null
          codigo: string | null
          created_at: string | null
          descripcion: string | null
          estado: string | null
          fecha_decision: string | null
          hipotesis: string | null
          id: string
          last_kpi_disponible: string | null
          proxima_decision: string | null
          test_activo: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_decision?: string | null
          hipotesis?: string | null
          id?: string
          last_kpi_disponible?: string | null
          proxima_decision?: string | null
          test_activo?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_decision?: string | null
          hipotesis?: string | null
          id?: string
          last_kpi_disponible?: string | null
          proxima_decision?: string | null
          test_activo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bottlenecks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          attendees: Json | null
          calendar_email: string | null
          created_at: string
          description: string | null
          end_time: string
          google_event_id: string
          id: string
          location: string | null
          start_time: string
          synced_at: string
          team_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: Json | null
          calendar_email?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          google_event_id: string
          id?: string
          location?: string | null
          start_time: string
          synced_at?: string
          team_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: Json | null
          calendar_email?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          google_event_id?: string
          id?: string
          location?: string | null
          start_time?: string
          synced_at?: string
          team_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_team_user_id_fkey"
            columns: ["team_user_id"]
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
      client_closer_calls: {
        Row: {
          ad_id: string | null
          califico: boolean | null
          capacidad_ahorro: string | null
          cerro: boolean | null
          client_id: string | null
          closer: string | null
          comision_estimada: number | null
          created_at: string | null
          created_by: string | null
          edad: number | null
          estado_seguimiento: string | null
          fecha_llamada: string | null
          followup_count: number | null
          followup_notes: string | null
          fuente: string | null
          ghl_appointment_id: string | null
          hijos_casado: string | null
          hora_llamada: string | null
          id: string
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          loss_reason: string | null
          next_followup_date: string | null
          nicho: string | null
          nivel_ingresos: string | null
          notes: string | null
          num_cuotas: number | null
          objections: string | null
          oferta_hecha: boolean | null
          owner_type: string | null
          pago_en_llamada: boolean | null
          precio: number | null
          preocupacion_actual: string | null
          producto: string | null
          reagenda_texto: string | null
          se_presento: boolean | null
          seguimiento_requerido: boolean | null
          segunda_llamada_fecha: string | null
          segunda_llamada_se_presento: boolean | null
          segunda_llamada_status: string | null
          setter_agendo: string | null
          situacion_3ra_llamada: string | null
          situacion_laboral: string | null
          situacion_resultado: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          ad_id?: string | null
          califico?: boolean | null
          capacidad_ahorro?: string | null
          cerro?: boolean | null
          client_id?: string | null
          closer?: string | null
          comision_estimada?: number | null
          created_at?: string | null
          created_by?: string | null
          edad?: number | null
          estado_seguimiento?: string | null
          fecha_llamada?: string | null
          followup_count?: number | null
          followup_notes?: string | null
          fuente?: string | null
          ghl_appointment_id?: string | null
          hijos_casado?: string | null
          hora_llamada?: string | null
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          loss_reason?: string | null
          next_followup_date?: string | null
          nicho?: string | null
          nivel_ingresos?: string | null
          notes?: string | null
          num_cuotas?: number | null
          objections?: string | null
          oferta_hecha?: boolean | null
          owner_type?: string | null
          pago_en_llamada?: boolean | null
          precio?: number | null
          preocupacion_actual?: string | null
          producto?: string | null
          reagenda_texto?: string | null
          se_presento?: boolean | null
          seguimiento_requerido?: boolean | null
          segunda_llamada_fecha?: string | null
          segunda_llamada_se_presento?: boolean | null
          segunda_llamada_status?: string | null
          setter_agendo?: string | null
          situacion_3ra_llamada?: string | null
          situacion_laboral?: string | null
          situacion_resultado?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          ad_id?: string | null
          califico?: boolean | null
          capacidad_ahorro?: string | null
          cerro?: boolean | null
          client_id?: string | null
          closer?: string | null
          comision_estimada?: number | null
          created_at?: string | null
          created_by?: string | null
          edad?: number | null
          estado_seguimiento?: string | null
          fecha_llamada?: string | null
          followup_count?: number | null
          followup_notes?: string | null
          fuente?: string | null
          ghl_appointment_id?: string | null
          hijos_casado?: string | null
          hora_llamada?: string | null
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          loss_reason?: string | null
          next_followup_date?: string | null
          nicho?: string | null
          nivel_ingresos?: string | null
          notes?: string | null
          num_cuotas?: number | null
          objections?: string | null
          oferta_hecha?: boolean | null
          owner_type?: string | null
          pago_en_llamada?: boolean | null
          precio?: number | null
          preocupacion_actual?: string | null
          producto?: string | null
          reagenda_texto?: string | null
          se_presento?: boolean | null
          seguimiento_requerido?: boolean | null
          segunda_llamada_fecha?: string | null
          segunda_llamada_se_presento?: boolean | null
          segunda_llamada_status?: string | null
          setter_agendo?: string | null
          situacion_3ra_llamada?: string | null
          situacion_laboral?: string | null
          situacion_resultado?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_closer_calls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_closer_calls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_closers: {
        Row: {
          active: boolean | null
          client_id: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_closers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_creatives: {
        Row: {
          angle_id: string | null
          channel: string | null
          client_id: string | null
          cpl: number | null
          created_at: string | null
          ctr: number | null
          drive_doc_id: string | null
          hypothesis: string | null
          id: string
          notes: string | null
          pipeline_stage: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string | null
          url: string
          variante_de: string | null
        }
        Insert: {
          angle_id?: string | null
          channel?: string | null
          client_id?: string | null
          cpl?: number | null
          created_at?: string | null
          ctr?: number | null
          drive_doc_id?: string | null
          hypothesis?: string | null
          id?: string
          notes?: string | null
          pipeline_stage?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string | null
          url: string
          variante_de?: string | null
        }
        Update: {
          angle_id?: string | null
          channel?: string | null
          client_id?: string | null
          cpl?: number | null
          created_at?: string | null
          ctr?: number | null
          drive_doc_id?: string | null
          hypothesis?: string | null
          id?: string
          notes?: string | null
          pipeline_stage?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
          variante_de?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_creatives_angle_id_fkey"
            columns: ["angle_id"]
            isOneToOne: false
            referencedRelation: "angles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_creatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_creatives_variante_de_fkey"
            columns: ["variante_de"]
            isOneToOne: false
            referencedRelation: "client_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      client_crm_calls: {
        Row: {
          asistio: boolean | null
          client_id: string | null
          created_at: string | null
          duracion_minutos: number | null
          fecha: string | null
          id: string
          link: string | null
          notas: string | null
          proxima_accion: string | null
          resultado: string | null
          sentiment: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          asistio?: boolean | null
          client_id?: string | null
          created_at?: string | null
          duracion_minutos?: number | null
          fecha?: string | null
          id?: string
          link?: string | null
          notas?: string | null
          proxima_accion?: string | null
          resultado?: string | null
          sentiment?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          asistio?: boolean | null
          client_id?: string | null
          created_at?: string | null
          duracion_minutos?: number | null
          fecha?: string | null
          id?: string
          link?: string | null
          notas?: string | null
          proxima_accion?: string | null
          resultado?: string | null
          sentiment?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_crm_calls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_csb: {
        Row: {
          angulo_principal: string | null
          client_id: string | null
          created_at: string | null
          drive_csl_id: string | null
          garantia: string | null
          hipotesis_activa: string | null
          icp: string | null
          id: string
          mercado: string | null
          notas: string | null
          objecion_principal: string | null
          oferta: string | null
          precio: number | null
          propuesta_de_valor: string | null
          updated_at: string | null
        }
        Insert: {
          angulo_principal?: string | null
          client_id?: string | null
          created_at?: string | null
          drive_csl_id?: string | null
          garantia?: string | null
          hipotesis_activa?: string | null
          icp?: string | null
          id?: string
          mercado?: string | null
          notas?: string | null
          objecion_principal?: string | null
          oferta?: string | null
          precio?: number | null
          propuesta_de_valor?: string | null
          updated_at?: string | null
        }
        Update: {
          angulo_principal?: string | null
          client_id?: string | null
          created_at?: string | null
          drive_csl_id?: string | null
          garantia?: string | null
          hipotesis_activa?: string | null
          icp?: string | null
          id?: string
          mercado?: string | null
          notas?: string | null
          objecion_principal?: string | null
          oferta?: string | null
          precio?: number | null
          propuesta_de_valor?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_csb_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_health: {
        Row: {
          client_id: string | null
          confianza: number | null
          created_at: string | null
          economia: number | null
          engagement: number | null
          fecha: string | null
          id: string
          notas: string | null
          respuesta: number | null
          score_total: number | null
          trust: number | null
        }
        Insert: {
          client_id?: string | null
          confianza?: number | null
          created_at?: string | null
          economia?: number | null
          engagement?: number | null
          fecha?: string | null
          id?: string
          notas?: string | null
          respuesta?: number | null
          score_total?: number | null
          trust?: number | null
        }
        Update: {
          client_id?: string | null
          confianza?: number | null
          created_at?: string | null
          economia?: number | null
          engagement?: number | null
          fecha?: string | null
          id?: string
          notas?: string | null
          respuesta?: number | null
          score_total?: number | null
          trust?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_health_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_hypotheses: {
        Row: {
          area: string | null
          client_id: string | null
          confianza: string | null
          created_at: string | null
          estado: string | null
          fecha_decision: string | null
          fecha_inicio: string | null
          hipotesis: string | null
          id: string
          resultado: string | null
          titulo: string | null
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          client_id?: string | null
          confianza?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_decision?: string | null
          fecha_inicio?: string | null
          hipotesis?: string | null
          id?: string
          resultado?: string | null
          titulo?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          client_id?: string | null
          confianza?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_decision?: string | null
          fecha_inicio?: string | null
          hipotesis?: string | null
          id?: string
          resultado?: string | null
          titulo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_hypotheses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_installments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          installment_number: number
          notes: string | null
          paid: boolean | null
          paid_date: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          installment_number: number
          notes?: string | null
          paid?: boolean | null
          paid_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          installment_number?: number
          notes?: string | null
          paid?: boolean | null
          paid_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_installments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_metrics: {
        Row: {
          ads_bookings: number | null
          ads_close_rate: number | null
          ads_cpbc: number | null
          ads_cpl: number | null
          ads_investment: number | null
          ads_leads: number | null
          ads_qualified_leads: number | null
          ads_show_rate: number | null
          client_id: string | null
          created_at: string | null
          id: string
          li_accept_rate: number | null
          li_booking_rate: number | null
          li_bookings: number | null
          li_calendly_rate: number | null
          li_connections_accepted: number | null
          li_connections_sent: number | null
          li_messages_sent: number | null
          li_offer_rate: number | null
          li_replies: number | null
          li_reply_rate: number | null
          show_ads_metrics: boolean | null
          show_li_metrics: boolean | null
          updated_at: string | null
          week_end: string | null
          week_number: number
          week_start: string
          year: number
        }
        Insert: {
          ads_bookings?: number | null
          ads_close_rate?: number | null
          ads_cpbc?: number | null
          ads_cpl?: number | null
          ads_investment?: number | null
          ads_leads?: number | null
          ads_qualified_leads?: number | null
          ads_show_rate?: number | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          li_accept_rate?: number | null
          li_booking_rate?: number | null
          li_bookings?: number | null
          li_calendly_rate?: number | null
          li_connections_accepted?: number | null
          li_connections_sent?: number | null
          li_messages_sent?: number | null
          li_offer_rate?: number | null
          li_replies?: number | null
          li_reply_rate?: number | null
          show_ads_metrics?: boolean | null
          show_li_metrics?: boolean | null
          updated_at?: string | null
          week_end?: string | null
          week_number: number
          week_start: string
          year: number
        }
        Update: {
          ads_bookings?: number | null
          ads_close_rate?: number | null
          ads_cpbc?: number | null
          ads_cpl?: number | null
          ads_investment?: number | null
          ads_leads?: number | null
          ads_qualified_leads?: number | null
          ads_show_rate?: number | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          li_accept_rate?: number | null
          li_booking_rate?: number | null
          li_bookings?: number | null
          li_calendly_rate?: number | null
          li_connections_accepted?: number | null
          li_connections_sent?: number | null
          li_messages_sent?: number | null
          li_offer_rate?: number | null
          li_replies?: number | null
          li_reply_rate?: number | null
          show_ads_metrics?: boolean | null
          show_li_metrics?: boolean | null
          updated_at?: string | null
          week_end?: string | null
          week_number?: number
          week_start?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_metrics_config: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          show_ads_close_rate: boolean | null
          show_ads_cpbc: boolean | null
          show_ads_cpl: boolean | null
          show_ads_investment: boolean | null
          show_ads_leads: boolean | null
          show_ads_qualified: boolean | null
          show_ads_section: boolean | null
          show_ads_show_rate: boolean | null
          show_closer_chart: boolean | null
          show_li_accept_rate: boolean | null
          show_li_booking_rate: boolean | null
          show_li_bookings: boolean | null
          show_li_calendly_rate: boolean | null
          show_li_offer_rate: boolean | null
          show_li_reply_rate: boolean | null
          show_li_section: boolean | null
          template_name: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          show_ads_close_rate?: boolean | null
          show_ads_cpbc?: boolean | null
          show_ads_cpl?: boolean | null
          show_ads_investment?: boolean | null
          show_ads_leads?: boolean | null
          show_ads_qualified?: boolean | null
          show_ads_section?: boolean | null
          show_ads_show_rate?: boolean | null
          show_closer_chart?: boolean | null
          show_li_accept_rate?: boolean | null
          show_li_booking_rate?: boolean | null
          show_li_bookings?: boolean | null
          show_li_calendly_rate?: boolean | null
          show_li_offer_rate?: boolean | null
          show_li_reply_rate?: boolean | null
          show_li_section?: boolean | null
          template_name?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          show_ads_close_rate?: boolean | null
          show_ads_cpbc?: boolean | null
          show_ads_cpl?: boolean | null
          show_ads_investment?: boolean | null
          show_ads_leads?: boolean | null
          show_ads_qualified?: boolean | null
          show_ads_section?: boolean | null
          show_ads_show_rate?: boolean | null
          show_closer_chart?: boolean | null
          show_li_accept_rate?: boolean | null
          show_li_booking_rate?: boolean | null
          show_li_bookings?: boolean | null
          show_li_calendly_rate?: boolean | null
          show_li_offer_rate?: boolean | null
          show_li_reply_rate?: boolean | null
          show_li_section?: boolean | null
          template_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_metrics_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_phases: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          phase_description: string | null
          phase_name: string
          phase_order: number
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          phase_description?: string | null
          phase_name: string
          phase_order: number
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          phase_description?: string | null
          phase_name?: string
          phase_order?: number
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_phases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_status: {
        Row: {
          active_phase_id: string | null
          client_id: string | null
          cpbc_current: number | null
          cpbc_objective: number | null
          current_win: string | null
          days_in_phase: number | null
          id: string
          last_call_date: string | null
          next_step: string | null
          updated_at: string | null
        }
        Insert: {
          active_phase_id?: string | null
          client_id?: string | null
          cpbc_current?: number | null
          cpbc_objective?: number | null
          current_win?: string | null
          days_in_phase?: number | null
          id?: string
          last_call_date?: string | null
          next_step?: string | null
          updated_at?: string | null
        }
        Update: {
          active_phase_id?: string | null
          client_id?: string | null
          cpbc_current?: number | null
          cpbc_objective?: number | null
          current_win?: string | null
          days_in_phase?: number | null
          id?: string
          last_call_date?: string | null
          next_step?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_status_active_phase_id_fkey"
            columns: ["active_phase_id"]
            isOneToOne: false
            referencedRelation: "client_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_status_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      client_videos: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          id: string
          sent_at: string | null
          title: string
          video_url: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          sent_at?: string | null
          title: string
          video_url: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          sent_at?: string | null
          title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_videos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          canal: string | null
          contract_days: number | null
          country: string | null
          created_at: string
          days_in_phase: number | null
          email: string | null
          end_date: string | null
          fase: string | null
          id: string
          installment_amount: number | null
          mrr: number | null
          name: string
          next_due_date: string | null
          notes: string | null
          offer_type: Database["public"]["Enums"]["offer_type"] | null
          paid_installments: number | null
          payment_type: Database["public"]["Enums"]["payment_type"] | null
          phone: string | null
          platform: Database["public"]["Enums"]["payment_platform"] | null
          platform_fee: number | null
          profile_id: string | null
          renewal_probability: number | null
          renewal_risk: string | null
          result_phase: string | null
          setter_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          task_phase: string | null
          total_amount: number | null
          total_installments: number | null
          updated_at: string
        }
        Insert: {
          canal?: string | null
          contract_days?: number | null
          country?: string | null
          created_at?: string
          days_in_phase?: number | null
          email?: string | null
          end_date?: string | null
          fase?: string | null
          id?: string
          installment_amount?: number | null
          mrr?: number | null
          name: string
          next_due_date?: string | null
          notes?: string | null
          offer_type?: Database["public"]["Enums"]["offer_type"] | null
          paid_installments?: number | null
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          phone?: string | null
          platform?: Database["public"]["Enums"]["payment_platform"] | null
          platform_fee?: number | null
          profile_id?: string | null
          renewal_probability?: number | null
          renewal_risk?: string | null
          result_phase?: string | null
          setter_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          task_phase?: string | null
          total_amount?: number | null
          total_installments?: number | null
          updated_at?: string
        }
        Update: {
          canal?: string | null
          contract_days?: number | null
          country?: string | null
          created_at?: string
          days_in_phase?: number | null
          email?: string | null
          end_date?: string | null
          fase?: string | null
          id?: string
          installment_amount?: number | null
          mrr?: number | null
          name?: string
          next_due_date?: string | null
          notes?: string | null
          offer_type?: Database["public"]["Enums"]["offer_type"] | null
          paid_installments?: number | null
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          phone?: string | null
          platform?: Database["public"]["Enums"]["payment_platform"] | null
          platform_fee?: number | null
          profile_id?: string | null
          renewal_probability?: number | null
          renewal_risk?: string | null
          result_phase?: string | null
          setter_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          task_phase?: string | null
          total_amount?: number | null
          total_installments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "setters"
            referencedColumns: ["id"]
          },
        ]
      }
      closer_calls: {
        Row: {
          closer_id: string | null
          created_at: string
          first_call_attended: boolean | null
          first_call_date: string | null
          first_call_status: Database["public"]["Enums"]["call_status"] | null
          followup_count: number | null
          followup_notes: string | null
          fuente: string | null
          hora_llamada: string | null
          id: string
          last_followup_date: string | null
          lead_email: string | null
          lead_name: string
          lead_phone: string | null
          loss_reason: string | null
          next_followup_date: string | null
          nicho: string | null
          notes: string | null
          num_cuotas: number | null
          objections: string | null
          pago_en_llamada: boolean | null
          paid: boolean | null
          price: number | null
          qualified: boolean | null
          rescheduled_date: string | null
          second_call_date: string | null
          second_call_status: Database["public"]["Enums"]["call_status"] | null
          setter_agendo: string | null
          setter_id: string | null
          sheet_row_id: string | null
          situacion_resultado: string | null
          updated_at: string
        }
        Insert: {
          closer_id?: string | null
          created_at?: string
          first_call_attended?: boolean | null
          first_call_date?: string | null
          first_call_status?: Database["public"]["Enums"]["call_status"] | null
          followup_count?: number | null
          followup_notes?: string | null
          fuente?: string | null
          hora_llamada?: string | null
          id?: string
          last_followup_date?: string | null
          lead_email?: string | null
          lead_name: string
          lead_phone?: string | null
          loss_reason?: string | null
          next_followup_date?: string | null
          nicho?: string | null
          notes?: string | null
          num_cuotas?: number | null
          objections?: string | null
          pago_en_llamada?: boolean | null
          paid?: boolean | null
          price?: number | null
          qualified?: boolean | null
          rescheduled_date?: string | null
          second_call_date?: string | null
          second_call_status?: Database["public"]["Enums"]["call_status"] | null
          setter_agendo?: string | null
          setter_id?: string | null
          sheet_row_id?: string | null
          situacion_resultado?: string | null
          updated_at?: string
        }
        Update: {
          closer_id?: string | null
          created_at?: string
          first_call_attended?: boolean | null
          first_call_date?: string | null
          first_call_status?: Database["public"]["Enums"]["call_status"] | null
          followup_count?: number | null
          followup_notes?: string | null
          fuente?: string | null
          hora_llamada?: string | null
          id?: string
          last_followup_date?: string | null
          lead_email?: string | null
          lead_name?: string
          lead_phone?: string | null
          loss_reason?: string | null
          next_followup_date?: string | null
          nicho?: string | null
          notes?: string | null
          num_cuotas?: number | null
          objections?: string | null
          pago_en_llamada?: boolean | null
          paid?: boolean | null
          price?: number | null
          qualified?: boolean | null
          rescheduled_date?: string | null
          second_call_date?: string | null
          second_call_status?: Database["public"]["Enums"]["call_status"] | null
          setter_agendo?: string | null
          setter_id?: string | null
          sheet_row_id?: string | null
          situacion_resultado?: string | null
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
          {
            foreignKeyName: "closer_calls_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "setters"
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
      crm_clientes: {
        Row: {
          asistio: boolean | null
          calificacion: string | null
          calificado: boolean | null
          canal: string | null
          cerrado: boolean | null
          client_id: string
          closer: string | null
          created_at: string | null
          etapa: string | null
          fecha_agenda: string | null
          fecha_llamada: string | null
          fecha_primer_contacto: string | null
          fecha_segunda_reunion: string | null
          followup_count: number | null
          id: string
          lead_email: string | null
          lead_linkedin: string | null
          lead_nombre: string
          lead_telefono: string | null
          monto: number | null
          next_followup_date: string | null
          notas: string | null
          objeciones: string | null
          recording_url: string | null
          resultado_segunda_reunion: string | null
          segunda_reunion: boolean | null
          setter_id: string | null
          updated_at: string | null
        }
        Insert: {
          asistio?: boolean | null
          calificacion?: string | null
          calificado?: boolean | null
          canal?: string | null
          cerrado?: boolean | null
          client_id: string
          closer?: string | null
          created_at?: string | null
          etapa?: string | null
          fecha_agenda?: string | null
          fecha_llamada?: string | null
          fecha_primer_contacto?: string | null
          fecha_segunda_reunion?: string | null
          followup_count?: number | null
          id?: string
          lead_email?: string | null
          lead_linkedin?: string | null
          lead_nombre: string
          lead_telefono?: string | null
          monto?: number | null
          next_followup_date?: string | null
          notas?: string | null
          objeciones?: string | null
          recording_url?: string | null
          resultado_segunda_reunion?: string | null
          segunda_reunion?: boolean | null
          setter_id?: string | null
          updated_at?: string | null
        }
        Update: {
          asistio?: boolean | null
          calificacion?: string | null
          calificado?: boolean | null
          canal?: string | null
          cerrado?: boolean | null
          client_id?: string
          closer?: string | null
          created_at?: string | null
          etapa?: string | null
          fecha_agenda?: string | null
          fecha_llamada?: string | null
          fecha_primer_contacto?: string | null
          fecha_segunda_reunion?: string | null
          followup_count?: number | null
          id?: string
          lead_email?: string | null
          lead_linkedin?: string | null
          lead_nombre?: string
          lead_telefono?: string | null
          monto?: number | null
          next_followup_date?: string | null
          notas?: string | null
          objeciones?: string | null
          recording_url?: string | null
          resultado_segunda_reunion?: string | null
          segunda_reunion?: boolean | null
          setter_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_clientes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_clientes_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "setters"
            referencedColumns: ["id"]
          },
        ]
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
      embeds: {
        Row: {
          created_at: string
          id: string
          kind: string | null
          playbook_id: string | null
          position: number | null
          sop_id: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string | null
          playbook_id?: string | null
          position?: number | null
          sop_id?: string | null
          title?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string | null
          playbook_id?: string | null
          position?: number | null
          sop_id?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          cost_type: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          name: string
          sheet_row_id: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          cost_type?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          name: string
          sheet_row_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          cost_type?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          name?: string
          sheet_row_id?: string | null
        }
        Relationships: []
      }
      experience_layer: {
        Row: {
          client_id: string | null
          created_at: string | null
          descripcion: string | null
          dias_desde_ultimo_contacto: number | null
          fecha: string | null
          id: string
          link: string | null
          sentiment: string | null
          tipo: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          dias_desde_ultimo_contacto?: number | null
          fecha?: string | null
          id?: string
          link?: string | null
          sentiment?: string | null
          tipo?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          dias_desde_ultimo_contacto?: number | null
          fecha?: string | null
          id?: string
          link?: string | null
          sentiment?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experience_layer_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_cliente: {
        Row: {
          accion_tomada: string | null
          calidad_leads: number | null
          client_id: string
          comentario_negativo: string | null
          comentario_positivo: string | null
          created_at: string | null
          fecha: string
          id: string
          nps: number | null
          riesgo_churn: boolean | null
          satisfaccion_general: number | null
          satisfaccion_setter: number | null
          semana: number | null
        }
        Insert: {
          accion_tomada?: string | null
          calidad_leads?: number | null
          client_id: string
          comentario_negativo?: string | null
          comentario_positivo?: string | null
          created_at?: string | null
          fecha?: string
          id?: string
          nps?: number | null
          riesgo_churn?: boolean | null
          satisfaccion_general?: number | null
          satisfaccion_setter?: number | null
          semana?: number | null
        }
        Update: {
          accion_tomada?: string | null
          calidad_leads?: number | null
          client_id?: string
          comentario_negativo?: string | null
          comentario_positivo?: string | null
          created_at?: string | null
          fecha?: string
          id?: string
          nps?: number | null
          riesgo_churn?: boolean | null
          satisfaccion_general?: number | null
          satisfaccion_setter?: number | null
          semana?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_cliente_client_id_fkey"
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
      hitos_cliente: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          notas: string | null
          primer_cierre_fecha: string | null
          primera_agenda_fecha: string | null
          ps1_completado: boolean | null
          ps1_fecha: string | null
          ps2_completado: boolean | null
          ps2_fecha: string | null
          ps3_completado: boolean | null
          ps3_fecha: string | null
          sa1_completado: boolean | null
          sa1_fecha: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          notas?: string | null
          primer_cierre_fecha?: string | null
          primera_agenda_fecha?: string | null
          ps1_completado?: boolean | null
          ps1_fecha?: string | null
          ps2_completado?: boolean | null
          ps2_fecha?: string | null
          ps3_completado?: boolean | null
          ps3_fecha?: string | null
          sa1_completado?: boolean | null
          sa1_fecha?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          notas?: string | null
          primer_cierre_fecha?: string | null
          primera_agenda_fecha?: string | null
          ps1_completado?: boolean | null
          ps1_fecha?: string | null
          ps2_completado?: boolean | null
          ps2_fecha?: string | null
          ps3_completado?: boolean | null
          ps3_fecha?: string | null
          sa1_completado?: boolean | null
          sa1_fecha?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hitos_cliente_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hypothesis_history: {
        Row: {
          angle_id: string | null
          aprendizaje: string | null
          client_id: string | null
          created_at: string | null
          fecha_cierre: string | null
          fecha_inicio: string | null
          hipotesis: string | null
          id: string
          metricas_fin: Json | null
          metricas_inicio: Json | null
          resultado: string | null
        }
        Insert: {
          angle_id?: string | null
          aprendizaje?: string | null
          client_id?: string | null
          created_at?: string | null
          fecha_cierre?: string | null
          fecha_inicio?: string | null
          hipotesis?: string | null
          id?: string
          metricas_fin?: Json | null
          metricas_inicio?: Json | null
          resultado?: string | null
        }
        Update: {
          angle_id?: string | null
          aprendizaje?: string | null
          client_id?: string | null
          created_at?: string | null
          fecha_cierre?: string | null
          fecha_inicio?: string | null
          hipotesis?: string | null
          id?: string
          metricas_fin?: Json | null
          metricas_inicio?: Json | null
          resultado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hypothesis_history_angle_id_fkey"
            columns: ["angle_id"]
            isOneToOne: false
            referencedRelation: "angles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hypothesis_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          date: string
          id: string
          sheet_row_id: string | null
          source: string
          type: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          date: string
          id?: string
          sheet_row_id?: string | null
          source: string
          type?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          sheet_row_id?: string | null
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
      kanban_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          playbook_id: string | null
          position: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          playbook_id?: string | null
          position?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          playbook_id?: string | null
          position?: number | null
        }
        Relationships: []
      }
      li_account_metrics: {
        Row: {
          accept_rate: number | null
          account_name: string
          booking_rate: number | null
          bookings: number | null
          calendly_rate: number | null
          client_id: string | null
          created_at: string | null
          id: string
          offer_rate: number | null
          reply_rate: number | null
          updated_at: string | null
          week_number: number
          week_start: string
          year: number
        }
        Insert: {
          accept_rate?: number | null
          account_name: string
          booking_rate?: number | null
          bookings?: number | null
          calendly_rate?: number | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          offer_rate?: number | null
          reply_rate?: number | null
          updated_at?: string | null
          week_number: number
          week_start: string
          year: number
        }
        Update: {
          accept_rate?: number | null
          account_name?: string
          booking_rate?: number | null
          bookings?: number | null
          calendly_rate?: number | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          offer_rate?: number | null
          reply_rate?: number | null
          updated_at?: string | null
          week_number?: number
          week_start?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "li_account_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          show_ads_close_rate: boolean | null
          show_ads_cpbc: boolean | null
          show_ads_cpl: boolean | null
          show_ads_investment: boolean | null
          show_ads_leads: boolean | null
          show_ads_qualified: boolean | null
          show_ads_section: boolean | null
          show_ads_show_rate: boolean | null
          show_li_accept_rate: boolean | null
          show_li_booking_rate: boolean | null
          show_li_bookings: boolean | null
          show_li_calendly_rate: boolean | null
          show_li_offer_rate: boolean | null
          show_li_reply_rate: boolean | null
          show_li_section: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          show_ads_close_rate?: boolean | null
          show_ads_cpbc?: boolean | null
          show_ads_cpl?: boolean | null
          show_ads_investment?: boolean | null
          show_ads_leads?: boolean | null
          show_ads_qualified?: boolean | null
          show_ads_section?: boolean | null
          show_ads_show_rate?: boolean | null
          show_li_accept_rate?: boolean | null
          show_li_booking_rate?: boolean | null
          show_li_bookings?: boolean | null
          show_li_calendly_rate?: boolean | null
          show_li_offer_rate?: boolean | null
          show_li_reply_rate?: boolean | null
          show_li_section?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          show_ads_close_rate?: boolean | null
          show_ads_cpbc?: boolean | null
          show_ads_cpl?: boolean | null
          show_ads_investment?: boolean | null
          show_ads_leads?: boolean | null
          show_ads_qualified?: boolean | null
          show_ads_section?: boolean | null
          show_ads_show_rate?: boolean | null
          show_li_accept_rate?: boolean | null
          show_li_booking_rate?: boolean | null
          show_li_bookings?: boolean | null
          show_li_calendly_rate?: boolean | null
          show_li_offer_rate?: boolean | null
          show_li_reply_rate?: boolean | null
          show_li_section?: boolean | null
        }
        Relationships: []
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
      negocio_contexto_semanal: {
        Row: {
          año: number
          contexto_adicional: string | null
          created_at: string | null
          fecha_inicio: string | null
          foco_principal: string | null
          horas_disponibles: number | null
          id: string
          objetivos_del_mes: string | null
          resuelto_semana_anterior: string | null
          semana: number
          trabado_actual: string | null
        }
        Insert: {
          año: number
          contexto_adicional?: string | null
          created_at?: string | null
          fecha_inicio?: string | null
          foco_principal?: string | null
          horas_disponibles?: number | null
          id?: string
          objetivos_del_mes?: string | null
          resuelto_semana_anterior?: string | null
          semana: number
          trabado_actual?: string | null
        }
        Update: {
          año?: number
          contexto_adicional?: string | null
          created_at?: string | null
          fecha_inicio?: string | null
          foco_principal?: string | null
          horas_disponibles?: number | null
          id?: string
          objetivos_del_mes?: string | null
          resuelto_semana_anterior?: string | null
          semana?: number
          trabado_actual?: string | null
        }
        Relationships: []
      }
      negocio_objetivos: {
        Row: {
          area: string | null
          created_at: string | null
          estado: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          meta_numerica: number | null
          notas: string | null
          objetivo: string
          periodo: string | null
          resultado_clave: string | null
          unidad: string | null
          updated_at: string | null
          valor_actual: number | null
        }
        Insert: {
          area?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          meta_numerica?: number | null
          notas?: string | null
          objetivo: string
          periodo?: string | null
          resultado_clave?: string | null
          unidad?: string | null
          updated_at?: string | null
          valor_actual?: number | null
        }
        Update: {
          area?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          meta_numerica?: number | null
          notas?: string | null
          objetivo?: string
          periodo?: string | null
          resultado_clave?: string | null
          unidad?: string | null
          updated_at?: string | null
          valor_actual?: number | null
        }
        Relationships: []
      }
      negocio_roadmap: {
        Row: {
          area: string | null
          created_at: string | null
          descripcion: string | null
          esfuerzo_estimado: string | null
          estado: string | null
          fecha_completado: string | null
          fecha_objetivo: string | null
          id: string
          impacto_esperado: string | null
          notas: string | null
          prioridad: number | null
          responsable: string | null
          tipo: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string | null
          descripcion?: string | null
          esfuerzo_estimado?: string | null
          estado?: string | null
          fecha_completado?: string | null
          fecha_objetivo?: string | null
          id?: string
          impacto_esperado?: string | null
          notas?: string | null
          prioridad?: number | null
          responsable?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string | null
          descripcion?: string | null
          esfuerzo_estimado?: string | null
          estado?: string | null
          fecha_completado?: string | null
          fecha_objetivo?: string | null
          id?: string
          impacto_esperado?: string | null
          notas?: string | null
          prioridad?: number | null
          responsable?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      onboarding_cliente: {
        Row: {
          client_id: string
          completado: boolean | null
          created_at: string | null
          fase: string | null
          fecha_completado: string | null
          id: string
          item: string
          notas: string | null
          orden: number | null
          responsable: string | null
        }
        Insert: {
          client_id: string
          completado?: boolean | null
          created_at?: string | null
          fase?: string | null
          fecha_completado?: string | null
          id?: string
          item: string
          notas?: string | null
          orden?: number | null
          responsable?: string | null
        }
        Update: {
          client_id?: string
          completado?: boolean | null
          created_at?: string | null
          fase?: string | null
          fecha_completado?: string | null
          id?: string
          item?: string
          notas?: string | null
          orden?: number | null
          responsable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_cliente_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      playbook_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          playbook_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          playbook_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          playbook_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playbook_attachments_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      playbooks: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string | null
          owner_name: string | null
          position: number | null
          status: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string | null
          owner_name?: string | null
          position?: number | null
          status?: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string | null
          owner_name?: string | null
          position?: number | null
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "playbook_categories"
            referencedColumns: ["id"]
          },
        ]
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
      registro_semanal_fullfillment: {
        Row: {
          agendas_generadas: number | null
          año: number
          calificados: number | null
          cerrados: number | null
          client_id: string
          created_at: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          llamadas_realizadas: number | null
          no_shows: number | null
          notas: string | null
          semana: number
          show_rate: number | null
          tasa_calificacion: number | null
          tasa_cierre: number | null
        }
        Insert: {
          agendas_generadas?: number | null
          año: number
          calificados?: number | null
          cerrados?: number | null
          client_id: string
          created_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          llamadas_realizadas?: number | null
          no_shows?: number | null
          notas?: string | null
          semana: number
          show_rate?: number | null
          tasa_calificacion?: number | null
          tasa_cierre?: number | null
        }
        Update: {
          agendas_generadas?: number | null
          año?: number
          calificados?: number | null
          cerrados?: number | null
          client_id?: string
          created_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          llamadas_realizadas?: number | null
          no_shows?: number | null
          notas?: string | null
          semana?: number
          show_rate?: number | null
          tasa_calificacion?: number | null
          tasa_cierre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_semanal_fullfillment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          client_id: string
          created_at: string
          enviado: boolean
          enviado_at: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          mes: string
          metricas: Json
          narrativa: Json
          pdf_url: string | null
          periodo_tipo: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          enviado?: boolean
          enviado_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          mes: string
          metricas?: Json
          narrativa?: Json
          pdf_url?: string | null
          periodo_tipo?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          enviado?: boolean
          enviado_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          mes?: string
          metricas?: Json
          narrativa?: Json
          pdf_url?: string | null
          periodo_tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_materials: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          id: string
          order_index: number | null
          title: string
          type: string | null
          url: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          title: string
          type?: string | null
          url: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          title?: string
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_materials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          angle_id: string | null
          client_id: string | null
          contenido: string | null
          created_at: string | null
          drive_doc_id: string | null
          estado: string | null
          id: string
          notas: string | null
          titulo: string | null
          updated_at: string | null
          variante_de: string | null
          version: number | null
        }
        Insert: {
          angle_id?: string | null
          client_id?: string | null
          contenido?: string | null
          created_at?: string | null
          drive_doc_id?: string | null
          estado?: string | null
          id?: string
          notas?: string | null
          titulo?: string | null
          updated_at?: string | null
          variante_de?: string | null
          version?: number | null
        }
        Update: {
          angle_id?: string | null
          client_id?: string | null
          contenido?: string | null
          created_at?: string | null
          drive_doc_id?: string | null
          estado?: string | null
          id?: string
          notas?: string | null
          titulo?: string | null
          updated_at?: string | null
          variante_de?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_angle_id_fkey"
            columns: ["angle_id"]
            isOneToOne: false
            referencedRelation: "angles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_variante_de_fkey"
            columns: ["variante_de"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      setter_meetings: {
        Row: {
          attended: boolean | null
          closed: boolean | null
          created_at: string
          id: string
          lead_email: string | null
          lead_name: string
          lead_phone: string | null
          notes: string | null
          qualified: boolean | null
          scheduled_date: string
          setter_id: string
        }
        Insert: {
          attended?: boolean | null
          closed?: boolean | null
          created_at?: string
          id?: string
          lead_email?: string | null
          lead_name: string
          lead_phone?: string | null
          notes?: string | null
          qualified?: boolean | null
          scheduled_date: string
          setter_id: string
        }
        Update: {
          attended?: boolean | null
          closed?: boolean | null
          created_at?: string
          id?: string
          lead_email?: string | null
          lead_name?: string
          lead_phone?: string | null
          notes?: string | null
          qualified?: boolean | null
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
      setter_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          meetings_count: number | null
          notes: string | null
          payment_date: string
          period_end: string | null
          period_start: string | null
          setter_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          meetings_count?: number | null
          notes?: string | null
          payment_date?: string
          period_end?: string | null
          period_start?: string | null
          setter_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          meetings_count?: number | null
          notes?: string | null
          payment_date?: string
          period_end?: string | null
          period_start?: string | null
          setter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setter_payments_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "setters"
            referencedColumns: ["id"]
          },
        ]
      }
      setters: {
        Row: {
          availability_hours: string | null
          avatar: string | null
          commitment: number | null
          country: string | null
          created_at: string
          dedicated_hours: number | null
          goal: number | null
          id: string
          name: string
          notes: string | null
          performance: Database["public"]["Enums"]["setter_performance"] | null
          platform: string | null
          setter_status: Database["public"]["Enums"]["setter_status"] | null
          stage: Database["public"]["Enums"]["setter_stage"] | null
          start_date: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          availability_hours?: string | null
          avatar?: string | null
          commitment?: number | null
          country?: string | null
          created_at?: string
          dedicated_hours?: number | null
          goal?: number | null
          id?: string
          name: string
          notes?: string | null
          performance?: Database["public"]["Enums"]["setter_performance"] | null
          platform?: string | null
          setter_status?: Database["public"]["Enums"]["setter_status"] | null
          stage?: Database["public"]["Enums"]["setter_stage"] | null
          start_date?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          availability_hours?: string | null
          avatar?: string | null
          commitment?: number | null
          country?: string | null
          created_at?: string
          dedicated_hours?: number | null
          goal?: number | null
          id?: string
          name?: string
          notes?: string | null
          performance?: Database["public"]["Enums"]["setter_performance"] | null
          platform?: string | null
          setter_status?: Database["public"]["Enums"]["setter_status"] | null
          stage?: Database["public"]["Enums"]["setter_stage"] | null
          start_date?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      setting_aprobaciones: {
        Row: {
          created_at: string | null
          cuenta: string | null
          decision: string | null
          diagnostico: string | null
          estado: string | null
          fecha: string | null
          fecha_decision: string | null
          hipotesis: string | null
          id: string
          metrica_obj: string | null
          msj_ant: string | null
          msj_nuevo: string | null
          nivel_modificacion: string | null
          setter: string | null
          updated_at: string | null
          valor_actual: string | null
          valor_kpi: string | null
          variable: string | null
          variante_1_ant: string | null
          variante_1_nueva: string | null
          variante_2_ant: string | null
          variante_2_nueva: string | null
        }
        Insert: {
          created_at?: string | null
          cuenta?: string | null
          decision?: string | null
          diagnostico?: string | null
          estado?: string | null
          fecha?: string | null
          fecha_decision?: string | null
          hipotesis?: string | null
          id: string
          metrica_obj?: string | null
          msj_ant?: string | null
          msj_nuevo?: string | null
          nivel_modificacion?: string | null
          setter?: string | null
          updated_at?: string | null
          valor_actual?: string | null
          valor_kpi?: string | null
          variable?: string | null
          variante_1_ant?: string | null
          variante_1_nueva?: string | null
          variante_2_ant?: string | null
          variante_2_nueva?: string | null
        }
        Update: {
          created_at?: string | null
          cuenta?: string | null
          decision?: string | null
          diagnostico?: string | null
          estado?: string | null
          fecha?: string | null
          fecha_decision?: string | null
          hipotesis?: string | null
          id?: string
          metrica_obj?: string | null
          msj_ant?: string | null
          msj_nuevo?: string | null
          nivel_modificacion?: string | null
          setter?: string | null
          updated_at?: string | null
          valor_actual?: string | null
          valor_kpi?: string | null
          variable?: string | null
          variante_1_ant?: string | null
          variante_1_nueva?: string | null
          variante_2_ant?: string | null
          variante_2_nueva?: string | null
        }
        Relationships: []
      }
      setting_base_listas: {
        Row: {
          cliente: string | null
          created_at: string | null
          estado: string | null
          fecha_descarga: string | null
          id: string
          leads_disponibles: number | null
          leads_usados: number | null
          nombre_lista: string | null
          notas: string | null
          total_leads: number | null
        }
        Insert: {
          cliente?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_descarga?: string | null
          id: string
          leads_disponibles?: number | null
          leads_usados?: number | null
          nombre_lista?: string | null
          notas?: string | null
          total_leads?: number | null
        }
        Update: {
          cliente?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_descarga?: string | null
          id?: string
          leads_disponibles?: number | null
          leads_usados?: number | null
          nombre_lista?: string | null
          notas?: string | null
          total_leads?: number | null
        }
        Relationships: []
      }
      setting_config: {
        Row: {
          cliente: string | null
          cuenta_linkedin: string
          email: string | null
          estado: string | null
          folder_drive: string | null
          nicho: string | null
          setter: string | null
          updated_at: string | null
          version_actual: string | null
        }
        Insert: {
          cliente?: string | null
          cuenta_linkedin: string
          email?: string | null
          estado?: string | null
          folder_drive?: string | null
          nicho?: string | null
          setter?: string | null
          updated_at?: string | null
          version_actual?: string | null
        }
        Update: {
          cliente?: string | null
          cuenta_linkedin?: string
          email?: string | null
          estado?: string | null
          folder_drive?: string | null
          nicho?: string | null
          setter?: string | null
          updated_at?: string | null
          version_actual?: string | null
        }
        Relationships: []
      }
      setting_crm_diario: {
        Row: {
          agendas: number | null
          calendarios: number | null
          cliente: string | null
          conexiones: number | null
          created_at: string | null
          cuenta: string | null
          fecha: string
          fups: number | null
          id: string
          mensajes: number | null
          propuestas: number | null
          resp_total: number | null
          respuestas: number | null
          setter: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          agendas?: number | null
          calendarios?: number | null
          cliente?: string | null
          conexiones?: number | null
          created_at?: string | null
          cuenta?: string | null
          fecha: string
          fups?: number | null
          id: string
          mensajes?: number | null
          propuestas?: number | null
          resp_total?: number | null
          respuestas?: number | null
          setter: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          agendas?: number | null
          calendarios?: number | null
          cliente?: string | null
          conexiones?: number | null
          created_at?: string | null
          cuenta?: string | null
          fecha?: string
          fups?: number | null
          id?: string
          mensajes?: number | null
          propuestas?: number | null
          resp_total?: number | null
          respuestas?: number | null
          setter?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      setting_eod_raw: {
        Row: {
          abr: number | null
          agendas: number | null
          calendarios: number | null
          cliente: string | null
          conexiones: number | null
          created_at: string | null
          csr: number | null
          cuenta: string | null
          fecha: string
          fups: number | null
          id: string
          mensajes: number | null
          nicho: string | null
          propuestas: number | null
          prr: number | null
          respuestas: number | null
          setter: string | null
        }
        Insert: {
          abr?: number | null
          agendas?: number | null
          calendarios?: number | null
          cliente?: string | null
          conexiones?: number | null
          created_at?: string | null
          csr?: number | null
          cuenta?: string | null
          fecha: string
          fups?: number | null
          id: string
          mensajes?: number | null
          nicho?: string | null
          propuestas?: number | null
          prr?: number | null
          respuestas?: number | null
          setter?: string | null
        }
        Update: {
          abr?: number | null
          agendas?: number | null
          calendarios?: number | null
          cliente?: string | null
          conexiones?: number | null
          created_at?: string | null
          csr?: number | null
          cuenta?: string | null
          fecha?: string
          fups?: number | null
          id?: string
          mensajes?: number | null
          nicho?: string | null
          propuestas?: number | null
          prr?: number | null
          respuestas?: number | null
          setter?: string | null
        }
        Relationships: []
      }
      setting_estructuras_activas: {
        Row: {
          cliente: string | null
          cuenta_linkedin: string
          estado: string | null
          hipotesis: string | null
          id: string
          link_doc: string | null
          mensaje_actual: string | null
          mensaje_nuevo: string | null
          nicho: string | null
          resultado_esperado: string | null
          setter: string | null
          updated_at: string | null
          variable_en_test: string | null
          version_actual: string | null
        }
        Insert: {
          cliente?: string | null
          cuenta_linkedin: string
          estado?: string | null
          hipotesis?: string | null
          id?: string
          link_doc?: string | null
          mensaje_actual?: string | null
          mensaje_nuevo?: string | null
          nicho?: string | null
          resultado_esperado?: string | null
          setter?: string | null
          updated_at?: string | null
          variable_en_test?: string | null
          version_actual?: string | null
        }
        Update: {
          cliente?: string | null
          cuenta_linkedin?: string
          estado?: string | null
          hipotesis?: string | null
          id?: string
          link_doc?: string | null
          mensaje_actual?: string | null
          mensaje_nuevo?: string | null
          nicho?: string | null
          resultado_esperado?: string | null
          setter?: string | null
          updated_at?: string | null
          variable_en_test?: string | null
          version_actual?: string | null
        }
        Relationships: []
      }
      setting_formulario_semanal: {
        Row: {
          año: number | null
          created_at: string | null
          cuenta: string | null
          fecha: string | null
          hipotesis_propia: string | null
          id: string
          notas_adicionales: string | null
          patron_respuestas_positivas: string | null
          prospecto_se_enfrio: string | null
          respuesta_negativa_frecuente: string | null
          semana: number | null
          setter: string
          situacion_inusual: string | null
          tono_respuestas: string | null
        }
        Insert: {
          año?: number | null
          created_at?: string | null
          cuenta?: string | null
          fecha?: string | null
          hipotesis_propia?: string | null
          id?: string
          notas_adicionales?: string | null
          patron_respuestas_positivas?: string | null
          prospecto_se_enfrio?: string | null
          respuesta_negativa_frecuente?: string | null
          semana?: number | null
          setter: string
          situacion_inusual?: string | null
          tono_respuestas?: string | null
        }
        Update: {
          año?: number | null
          created_at?: string | null
          cuenta?: string | null
          fecha?: string | null
          hipotesis_propia?: string | null
          id?: string
          notas_adicionales?: string | null
          patron_respuestas_positivas?: string | null
          prospecto_se_enfrio?: string | null
          respuesta_negativa_frecuente?: string | null
          semana?: number | null
          setter?: string
          situacion_inusual?: string | null
          tono_respuestas?: string | null
        }
        Relationships: []
      }
      setting_historial_iteraciones: {
        Row: {
          created_at: string | null
          cuenta: string | null
          estado: string | null
          fecha: string | null
          hipotesis: string | null
          id: string
          metrica_objetivo: string | null
          msj_ant: string | null
          msj_nuevo: string | null
          resultado_abr: string | null
          resultado_csr: string | null
          resultado_prr: string | null
          semanas_activas: number | null
          variable: string | null
          version_ant: string | null
          version_nueva: string | null
        }
        Insert: {
          created_at?: string | null
          cuenta?: string | null
          estado?: string | null
          fecha?: string | null
          hipotesis?: string | null
          id: string
          metrica_objetivo?: string | null
          msj_ant?: string | null
          msj_nuevo?: string | null
          resultado_abr?: string | null
          resultado_csr?: string | null
          resultado_prr?: string | null
          semanas_activas?: number | null
          variable?: string | null
          version_ant?: string | null
          version_nueva?: string | null
        }
        Update: {
          created_at?: string | null
          cuenta?: string | null
          estado?: string | null
          fecha?: string | null
          hipotesis?: string | null
          id?: string
          metrica_objetivo?: string | null
          msj_ant?: string | null
          msj_nuevo?: string | null
          resultado_abr?: string | null
          resultado_csr?: string | null
          resultado_prr?: string | null
          semanas_activas?: number | null
          variable?: string | null
          version_ant?: string | null
          version_nueva?: string | null
        }
        Relationships: []
      }
      setting_leads_master: {
        Row: {
          cargo: string | null
          client_id: string | null
          created_at: string | null
          empresa: string | null
          estado: string | null
          etapa_embudo: string | null
          fecha_asignado: string | null
          fecha_carga: string | null
          headline: string | null
          id: string
          lista: string | null
          nombre: string | null
          setter_asignado: string | null
          ubicacion: string | null
          url: string | null
        }
        Insert: {
          cargo?: string | null
          client_id?: string | null
          created_at?: string | null
          empresa?: string | null
          estado?: string | null
          etapa_embudo?: string | null
          fecha_asignado?: string | null
          fecha_carga?: string | null
          headline?: string | null
          id: string
          lista?: string | null
          nombre?: string | null
          setter_asignado?: string | null
          ubicacion?: string | null
          url?: string | null
        }
        Update: {
          cargo?: string | null
          client_id?: string | null
          created_at?: string | null
          empresa?: string | null
          estado?: string | null
          etapa_embudo?: string | null
          fecha_asignado?: string | null
          fecha_carga?: string | null
          headline?: string | null
          id?: string
          lista?: string | null
          nombre?: string | null
          setter_asignado?: string | null
          ubicacion?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setting_leads_master_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      setting_resumen_semanal: {
        Row: {
          abr: number | null
          abr_status: string | null
          agendas: number | null
          año: number | null
          calendarios: number | null
          cliente: string | null
          created_at: string | null
          csr: number | null
          csr_status: string | null
          cuenta: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          mensajes: number | null
          nicho: string | null
          propuestas: number | null
          prr: number | null
          prr_status: string | null
          respuestas: number | null
          semana: number | null
          setter: string | null
          updated_at: string | null
        }
        Insert: {
          abr?: number | null
          abr_status?: string | null
          agendas?: number | null
          año?: number | null
          calendarios?: number | null
          cliente?: string | null
          created_at?: string | null
          csr?: number | null
          csr_status?: string | null
          cuenta?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id: string
          mensajes?: number | null
          nicho?: string | null
          propuestas?: number | null
          prr?: number | null
          prr_status?: string | null
          respuestas?: number | null
          semana?: number | null
          setter?: string | null
          updated_at?: string | null
        }
        Update: {
          abr?: number | null
          abr_status?: string | null
          agendas?: number | null
          año?: number | null
          calendarios?: number | null
          cliente?: string | null
          created_at?: string | null
          csr?: number | null
          csr_status?: string | null
          cuenta?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          mensajes?: number | null
          nicho?: string | null
          propuestas?: number | null
          prr?: number | null
          prr_status?: string | null
          respuestas?: number | null
          semana?: number | null
          setter?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sop_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          sop_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          sop_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          sop_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_attachments_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_checklist_items: {
        Row: {
          created_at: string
          id: string
          position: number | null
          sop_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number | null
          sop_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number | null
          sop_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_checklist_items_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_checklist_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_checklist_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sop_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_variables: {
        Row: {
          created_at: string
          default_value: string | null
          id: string
          key: string
          label: string | null
          sop_id: string
        }
        Insert: {
          created_at?: string
          default_value?: string | null
          id?: string
          key: string
          label?: string | null
          sop_id: string
        }
        Update: {
          created_at?: string
          default_value?: string | null
          id?: string
          key?: string
          label?: string | null
          sop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_variables_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_versions: {
        Row: {
          body: Json | null
          edited_at: string
          edited_by: string | null
          edited_by_name: string | null
          id: string
          sop_id: string
          version: number
        }
        Insert: {
          body?: Json | null
          edited_at?: string
          edited_by?: string | null
          edited_by_name?: string | null
          id?: string
          sop_id: string
          version: number
        }
        Update: {
          body?: Json | null
          edited_at?: string
          edited_by?: string | null
          edited_by_name?: string | null
          id?: string
          sop_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sop_versions_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sops: {
        Row: {
          body: Json | null
          created_at: string
          id: string
          owner_id: string | null
          owner_name: string | null
          playbook_id: string
          position: number | null
          stage: string | null
          title: string
          updated_at: string
          version: number
          video_url: string | null
        }
        Insert: {
          body?: Json | null
          created_at?: string
          id?: string
          owner_id?: string | null
          owner_name?: string | null
          playbook_id: string
          position?: number | null
          stage?: string | null
          title: string
          updated_at?: string
          version?: number
          video_url?: string | null
        }
        Update: {
          body?: Json | null
          created_at?: string
          id?: string
          owner_id?: string | null
          owner_name?: string | null
          playbook_id?: string
          position?: number | null
          stage?: string | null
          title?: string
          updated_at?: string
          version?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sops_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
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
      task_time_logs: {
        Row: {
          created_at: string
          duration_seconds: number
          ended_at: string
          id: string
          notes: string | null
          started_at: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          ended_at?: string
          id?: string
          notes?: string | null
          started_at?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string
          id?: string
          notes?: string | null
          started_at?: string | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_time_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          apalancada: string | null
          area: string | null
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          score: number | null
          status: Database["public"]["Enums"]["task_status"] | null
          tags: string[] | null
          tipo: string | null
          title: string
          updated_at: string
        }
        Insert: {
          apalancada?: string | null
          area?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          score?: number | null
          status?: Database["public"]["Enums"]["task_status"] | null
          tags?: string[] | null
          tipo?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          apalancada?: string | null
          area?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          score?: number | null
          status?: Database["public"]["Enums"]["task_status"] | null
          tags?: string[] | null
          tipo?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      vsl_events: {
        Row: {
          business_line: string | null
          client_id: string | null
          created_at: string | null
          event_name: string
          id: string
          landing_id: string | null
          page_url: string | null
          percent: number | null
          session_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          business_line?: string | null
          client_id?: string | null
          created_at?: string | null
          event_name: string
          id?: string
          landing_id?: string | null
          page_url?: string | null
          percent?: number | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          business_line?: string | null
          client_id?: string | null
          created_at?: string | null
          event_name?: string
          id?: string
          landing_id?: string | null
          page_url?: string | null
          percent?: number | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vsl_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboards: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          playbook_id: string | null
          scene: Json
          sop_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          playbook_id?: string | null
          scene?: Json
          sop_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          playbook_id?: string | null
          scene?: Json
          sop_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      availability_status: "disponible" | "ocupado" | "ausente" | "vacaciones"
      call_status:
        | "pendiente"
        | "realizada"
        | "no_asistio"
        | "reagendada"
        | "cancelada"
      client_status: "active" | "paused" | "finished" | "cancelled"
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
      setter_performance:
        | "alto"
        | "medio"
        | "bajo"
        | "alto_restriccion"
        | "medio_restriccion"
        | "bajo_restriccion"
      setter_stage: "nuevo" | "entrenamiento" | "activo" | "senior" | "lider"
      setter_status:
        | "activo"
        | "inactivo"
        | "introduciendose"
        | "pendiente_reunion"
        | "calentamiento"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      availability_status: ["disponible", "ocupado", "ausente", "vacaciones"],
      call_status: [
        "pendiente",
        "realizada",
        "no_asistio",
        "reagendada",
        "cancelada",
      ],
      client_status: ["active", "paused", "finished", "cancelled"],
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
      setter_performance: [
        "alto",
        "medio",
        "bajo",
        "alto_restriccion",
        "medio_restriccion",
        "bajo_restriccion",
      ],
      setter_stage: ["nuevo", "entrenamiento", "activo", "senior", "lider"],
      setter_status: [
        "activo",
        "inactivo",
        "introduciendose",
        "pendiente_reunion",
        "calentamiento",
      ],
      task_priority: ["alta", "media", "baja"],
      task_status: ["pendiente", "en_progreso", "completada"],
    },
  },
} as const
