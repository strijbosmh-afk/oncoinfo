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
      ai_summaries: {
        Row: {
          content: Json
          generated_at: string
          generated_by: string | null
          id: string
          is_current: boolean
          summary_type: string
          trial_id: string
          version: number
        }
        Insert: {
          content: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_current?: boolean
          summary_type: string
          trial_id: string
          version?: number
        }
        Update: {
          content?: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_current?: boolean
          summary_type?: string
          trial_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_summaries_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "trials"
            referencedColumns: ["id"]
          },
        ]
      }
      arms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sample_size: number | null
          treatment_details: string | null
          trial_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sample_size?: number | null
          treatment_details?: string | null
          trial_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sample_size?: number | null
          treatment_details?: string | null
          trial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arms_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "trials"
            referencedColumns: ["id"]
          },
        ]
      }
      drugs: {
        Row: {
          administration_route: string | null
          approved_indications: string[] | null
          brand_names: string[] | null
          common_regimens: string[] | null
          contraindications: string[] | null
          created_at: string
          cycle_length_days: number | null
          disease_areas: string[] | null
          display_order: number | null
          dosing_info: Json | null
          drug_class: string
          drug_interactions: string[] | null
          ema_approval_date: string | null
          fda_approval_date: string | null
          generic_name: string
          id: string
          is_on_zvz: boolean | null
          mechanism_of_action: string | null
          monitoring_requirements: string[] | null
          patient_counseling_points: string[] | null
          price_unit: string | null
          reference_links: string[] | null
          side_effects: Json | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          administration_route?: string | null
          approved_indications?: string[] | null
          brand_names?: string[] | null
          common_regimens?: string[] | null
          contraindications?: string[] | null
          created_at?: string
          cycle_length_days?: number | null
          disease_areas?: string[] | null
          display_order?: number | null
          dosing_info?: Json | null
          drug_class: string
          drug_interactions?: string[] | null
          ema_approval_date?: string | null
          fda_approval_date?: string | null
          generic_name: string
          id?: string
          is_on_zvz?: boolean | null
          mechanism_of_action?: string | null
          monitoring_requirements?: string[] | null
          patient_counseling_points?: string[] | null
          price_unit?: string | null
          reference_links?: string[] | null
          side_effects?: Json | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          administration_route?: string | null
          approved_indications?: string[] | null
          brand_names?: string[] | null
          common_regimens?: string[] | null
          contraindications?: string[] | null
          created_at?: string
          cycle_length_days?: number | null
          disease_areas?: string[] | null
          display_order?: number | null
          dosing_info?: Json | null
          drug_class?: string
          drug_interactions?: string[] | null
          ema_approval_date?: string | null
          fda_approval_date?: string | null
          generic_name?: string
          id?: string
          is_on_zvz?: boolean | null
          mechanism_of_action?: string | null
          monitoring_requirements?: string[] | null
          patient_counseling_points?: string[] | null
          price_unit?: string | null
          reference_links?: string[] | null
          side_effects?: Json | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      endpoints: {
        Row: {
          arm_id: string | null
          created_at: string
          endpoint_name: string
          endpoint_type: string
          hazard_ratio: number | null
          hazard_ratio_ci_lower: number | null
          hazard_ratio_ci_upper: number | null
          id: string
          median_months: number | null
          p_value: number | null
          rate_percent: number | null
          rate_timepoint_months: number | null
          survival_timepoints: Json | null
          trial_id: string
        }
        Insert: {
          arm_id?: string | null
          created_at?: string
          endpoint_name: string
          endpoint_type: string
          hazard_ratio?: number | null
          hazard_ratio_ci_lower?: number | null
          hazard_ratio_ci_upper?: number | null
          id?: string
          median_months?: number | null
          p_value?: number | null
          rate_percent?: number | null
          rate_timepoint_months?: number | null
          survival_timepoints?: Json | null
          trial_id: string
        }
        Update: {
          arm_id?: string | null
          created_at?: string
          endpoint_name?: string
          endpoint_type?: string
          hazard_ratio?: number | null
          hazard_ratio_ci_lower?: number | null
          hazard_ratio_ci_upper?: number | null
          id?: string
          median_months?: number | null
          p_value?: number | null
          rate_percent?: number | null
          rate_timepoint_months?: number | null
          survival_timepoints?: Json | null
          trial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "endpoints_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "arms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoints_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "trials"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_folder_content: {
        Row: {
          contraindications: string | null
          created_at: string
          dosing_info: string | null
          drug_id: string
          id: string
          introduction: string | null
          monitoring: string | null
          side_effects_common: string | null
          side_effects_serious: string | null
          tips: string | null
          updated_at: string
          usage_info: string | null
        }
        Insert: {
          contraindications?: string | null
          created_at?: string
          dosing_info?: string | null
          drug_id: string
          id?: string
          introduction?: string | null
          monitoring?: string | null
          side_effects_common?: string | null
          side_effects_serious?: string | null
          tips?: string | null
          updated_at?: string
          usage_info?: string | null
        }
        Update: {
          contraindications?: string | null
          created_at?: string
          dosing_info?: string | null
          drug_id?: string
          id?: string
          introduction?: string | null
          monitoring?: string | null
          side_effects_common?: string | null
          side_effects_serious?: string | null
          tips?: string | null
          updated_at?: string
          usage_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_folder_content_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: true
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      trials: {
        Row: {
          abstract: string | null
          acronym: string
          authors: string[] | null
          biomarkers: string[] | null
          blinding: string | null
          citation: string | null
          created_at: string
          created_by: string | null
          design_type: string | null
          disease_area: string
          doi: string | null
          drugs: string[] | null
          exclusion_criteria: Json | null
          id: string
          inclusion_criteria: Json | null
          intervention_classes: string[] | null
          is_open_access: boolean | null
          journal: string | null
          line_of_therapy: string | null
          original_km_plot_url: string | null
          phase: string | null
          primary_endpoint: string | null
          primary_endpoint_met: boolean | null
          publication_year: number | null
          pubmed_id: string | null
          randomization: string | null
          results_summary: Json | null
          safety_highlights: string | null
          sample_size: number | null
          secondary_endpoints: string[] | null
          setting: string | null
          title: string
          updated_at: string
        }
        Insert: {
          abstract?: string | null
          acronym: string
          authors?: string[] | null
          biomarkers?: string[] | null
          blinding?: string | null
          citation?: string | null
          created_at?: string
          created_by?: string | null
          design_type?: string | null
          disease_area: string
          doi?: string | null
          drugs?: string[] | null
          exclusion_criteria?: Json | null
          id?: string
          inclusion_criteria?: Json | null
          intervention_classes?: string[] | null
          is_open_access?: boolean | null
          journal?: string | null
          line_of_therapy?: string | null
          original_km_plot_url?: string | null
          phase?: string | null
          primary_endpoint?: string | null
          primary_endpoint_met?: boolean | null
          publication_year?: number | null
          pubmed_id?: string | null
          randomization?: string | null
          results_summary?: Json | null
          safety_highlights?: string | null
          sample_size?: number | null
          secondary_endpoints?: string[] | null
          setting?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          abstract?: string | null
          acronym?: string
          authors?: string[] | null
          biomarkers?: string[] | null
          blinding?: string | null
          citation?: string | null
          created_at?: string
          created_by?: string | null
          design_type?: string | null
          disease_area?: string
          doi?: string | null
          drugs?: string[] | null
          exclusion_criteria?: Json | null
          id?: string
          inclusion_criteria?: Json | null
          intervention_classes?: string[] | null
          is_open_access?: boolean | null
          journal?: string | null
          line_of_therapy?: string | null
          original_km_plot_url?: string | null
          phase?: string | null
          primary_endpoint?: string | null
          primary_endpoint_met?: boolean | null
          publication_year?: number | null
          pubmed_id?: string | null
          randomization?: string | null
          results_summary?: Json | null
          safety_highlights?: string | null
          sample_size?: number | null
          secondary_endpoints?: string[] | null
          setting?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_username: { Args: { _username: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "viewer"
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
      app_role: ["admin", "viewer"],
    },
  },
} as const
