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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          ack: boolean
          ack_at: string | null
          ack_by: string | null
          channel: string
          created_at: string
          detail: string | null
          id: string
          organization_id: string
          pipeline_id: string | null
          project_id: string | null
          run_id: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          updated_at: string
        }
        Insert: {
          ack?: boolean
          ack_at?: string | null
          ack_by?: string | null
          channel?: string
          created_at?: string
          detail?: string | null
          id?: string
          organization_id: string
          pipeline_id?: string | null
          project_id?: string | null
          run_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title: string
          updated_at?: string
        }
        Update: {
          ack?: boolean
          ack_at?: string | null
          ack_by?: string | null
          channel?: string
          created_at?: string
          detail?: string | null
          id?: string
          organization_id?: string
          pipeline_id?: string | null
          project_id?: string | null
          run_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          meta: Json
          organization_id: string
          target_kind: string | null
          target_ref: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: number
          meta?: Json
          organization_id: string
          target_kind?: string | null
          target_ref?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: number
          meta?: Json
          organization_id?: string
          target_kind?: string | null
          target_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          env_kind: Database["public"]["Enums"]["env_kind"]
          id: string
          kind: string
          last_sync_at: string | null
          name: string
          organization_id: string
          owner: string | null
          project_id: string
          rows_ingested_today: number
          schema_snapshot: Json
          status: Database["public"]["Enums"]["source_status"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          env_kind?: Database["public"]["Enums"]["env_kind"]
          id?: string
          kind: string
          last_sync_at?: string | null
          name: string
          organization_id: string
          owner?: string | null
          project_id: string
          rows_ingested_today?: number
          schema_snapshot?: Json
          status?: Database["public"]["Enums"]["source_status"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          env_kind?: Database["public"]["Enums"]["env_kind"]
          id?: string
          kind?: string
          last_sync_at?: string | null
          name?: string
          organization_id?: string
          owner?: string | null
          project_id?: string
          rows_ingested_today?: number
          schema_snapshot?: Json
          status?: Database["public"]["Enums"]["source_status"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_stale: boolean
          last_refreshed_at: string | null
          name: string
          organization_id: string
          owner: string | null
          pipeline_id: string | null
          profile: Json
          project_id: string
          rows: number
          schema: Json
          size_mb: number
          tags: string[]
          updated_at: string
          warehouse: string | null
          zone: Database["public"]["Enums"]["zone_kind"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_stale?: boolean
          last_refreshed_at?: string | null
          name: string
          organization_id: string
          owner?: string | null
          pipeline_id?: string | null
          profile?: Json
          project_id: string
          rows?: number
          schema?: Json
          size_mb?: number
          tags?: string[]
          updated_at?: string
          warehouse?: string | null
          zone?: Database["public"]["Enums"]["zone_kind"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_stale?: boolean
          last_refreshed_at?: string | null
          name?: string
          organization_id?: string
          owner?: string | null
          pipeline_id?: string | null
          profile?: Json
          project_id?: string
          rows?: number
          schema?: Json
          size_mb?: number
          tags?: string[]
          updated_at?: string
          warehouse?: string | null
          zone?: Database["public"]["Enums"]["zone_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "datasets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      environments: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["env_kind"]
          organization_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["env_kind"]
          organization_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["env_kind"]
          organization_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "environments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lineage_edges: {
        Row: {
          created_at: string
          from_kind: string
          from_ref: string
          id: string
          meta: Json
          organization_id: string
          project_id: string
          to_kind: string
          to_ref: string
        }
        Insert: {
          created_at?: string
          from_kind: string
          from_ref: string
          id?: string
          meta?: Json
          organization_id: string
          project_id: string
          to_kind: string
          to_ref: string
        }
        Update: {
          created_at?: string
          from_kind?: string
          from_ref?: string
          id?: string
          meta?: Json
          organization_id?: string
          project_id?: string
          to_kind?: string
          to_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineage_edges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineage_edges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          cost_usd: number
          created_at: string
          duration_sec: number | null
          error: string | null
          finished_at: string | null
          id: string
          organization_id: string
          pipeline_id: string
          rows: number
          started_at: string
          stats: Json
          status: Database["public"]["Enums"]["run_status"]
          triggered_by: string
          triggered_by_user: string | null
          version: number
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          duration_sec?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          organization_id: string
          pipeline_id: string
          rows?: number
          started_at?: string
          stats?: Json
          status?: Database["public"]["Enums"]["run_status"]
          triggered_by?: string
          triggered_by_user?: string | null
          version?: number
        }
        Update: {
          cost_usd?: number
          created_at?: string
          duration_sec?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          organization_id?: string
          pipeline_id?: string
          rows?: number
          started_at?: string
          stats?: Json
          status?: Database["public"]["Enums"]["run_status"]
          triggered_by?: string
          triggered_by_user?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_runs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_versions: {
        Row: {
          author_id: string | null
          created_at: string
          definition: Json
          id: string
          message: string | null
          organization_id: string
          pipeline_id: string
          version: number
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          definition: Json
          id?: string
          message?: string | null
          organization_id: string
          pipeline_id: string
          version: number
        }
        Update: {
          author_id?: string | null
          created_at?: string
          definition?: Json
          id?: string
          message?: string | null
          organization_id?: string
          pipeline_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_versions_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          avg_duration_sec: number
          cost_usd_today: number
          created_at: string
          created_by: string | null
          current_version: number
          definition: Json
          description: string | null
          destination: Json
          env_kind: Database["public"]["Enums"]["env_kind"]
          id: string
          last_run_at: string | null
          mode: string
          name: string
          organization_id: string
          owner: string | null
          project_id: string
          quality_score: number
          rows_processed_today: number
          schedule: string | null
          status: Database["public"]["Enums"]["pipeline_status"]
          success_rate: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          avg_duration_sec?: number
          cost_usd_today?: number
          created_at?: string
          created_by?: string | null
          current_version?: number
          definition?: Json
          description?: string | null
          destination?: Json
          env_kind?: Database["public"]["Enums"]["env_kind"]
          id?: string
          last_run_at?: string | null
          mode?: string
          name: string
          organization_id: string
          owner?: string | null
          project_id: string
          quality_score?: number
          rows_processed_today?: number
          schedule?: string | null
          status?: Database["public"]["Enums"]["pipeline_status"]
          success_rate?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          avg_duration_sec?: number
          cost_usd_today?: number
          created_at?: string
          created_by?: string | null
          current_version?: number
          definition?: Json
          description?: string | null
          destination?: Json
          env_kind?: Database["public"]["Enums"]["env_kind"]
          id?: string
          last_run_at?: string | null
          mode?: string
          name?: string
          organization_id?: string
          owner?: string | null
          project_id?: string
          quality_score?: number
          rows_processed_today?: number
          schedule?: string | null
          status?: Database["public"]["Enums"]["pipeline_status"]
          success_rate?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_results: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          organization_id: string
          passed: boolean
          rule_id: string
          run_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          organization_id: string
          passed: boolean
          rule_id: string
          run_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string
          passed?: boolean
          rule_id?: string
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "quality_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_rules: {
        Row: {
          config: Json
          created_at: string
          dataset_id: string | null
          enabled: boolean
          id: string
          kind: string
          name: string
          organization_id: string
          pipeline_id: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          dataset_id?: string | null
          enabled?: boolean
          id?: string
          kind: string
          name: string
          organization_id: string
          pipeline_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          dataset_id?: string | null
          enabled?: boolean
          id?: string
          kind?: string
          name?: string
          organization_id?: string
          pipeline_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_rules_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_rules_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      run_events: {
        Row: {
          id: number
          level: Database["public"]["Enums"]["log_level"]
          message: string
          metrics: Json | null
          node_id: string | null
          organization_id: string
          run_id: string
          ts: string
        }
        Insert: {
          id?: number
          level?: Database["public"]["Enums"]["log_level"]
          message: string
          metrics?: Json | null
          node_id?: string | null
          organization_id: string
          run_id: string
          ts?: string
        }
        Update: {
          id?: number
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          metrics?: Json | null
          node_id?: string | null
          organization_id?: string
          run_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_demo_workspace: { Args: never; Returns: string }
      can_run: { Args: { _org: string; _user: string }; Returns: boolean }
      can_write: { Args: { _org: string; _user: string }; Returns: boolean }
      has_role: {
        Args: {
          _org: string
          _role: Database["public"]["Enums"]["app_role"]
          _user: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
    }
    Enums: {
      alert_severity: "info" | "low" | "medium" | "high" | "critical"
      app_role: "admin" | "engineer" | "analyst" | "viewer"
      env_kind: "dev" | "test" | "stage" | "prod"
      log_level: "debug" | "info" | "warn" | "error"
      pipeline_status:
        | "healthy"
        | "running"
        | "failed"
        | "degraded"
        | "paused"
        | "scheduled"
        | "draft"
      run_status: "queued" | "running" | "success" | "failed" | "cancelled"
      source_status: "connected" | "syncing" | "error" | "idle"
      zone_kind: "bronze" | "silver" | "gold" | "archived"
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
      alert_severity: ["info", "low", "medium", "high", "critical"],
      app_role: ["admin", "engineer", "analyst", "viewer"],
      env_kind: ["dev", "test", "stage", "prod"],
      log_level: ["debug", "info", "warn", "error"],
      pipeline_status: [
        "healthy",
        "running",
        "failed",
        "degraded",
        "paused",
        "scheduled",
        "draft",
      ],
      run_status: ["queued", "running", "success", "failed", "cancelled"],
      source_status: ["connected", "syncing", "error", "idle"],
      zone_kind: ["bronze", "silver", "gold", "archived"],
    },
  },
} as const
