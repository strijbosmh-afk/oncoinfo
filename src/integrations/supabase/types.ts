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
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          hospital_id: string | null
          id: string
          user_id: string
          username: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          hospital_id?: string | null
          id?: string
          user_id: string
          username?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          hospital_id?: string | null
          id?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
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
          hospital_id: string | null
          id: string
          is_archived: boolean
          is_on_zvz: boolean | null
          mechanism_of_action: string | null
          monitoring_requirements: string[] | null
          patient_counseling_points: string[] | null
          price_unit: string | null
          reference_links: string[] | null
          registration_trial: string | null
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
          hospital_id?: string | null
          id?: string
          is_archived?: boolean
          is_on_zvz?: boolean | null
          mechanism_of_action?: string | null
          monitoring_requirements?: string[] | null
          patient_counseling_points?: string[] | null
          price_unit?: string | null
          reference_links?: string[] | null
          registration_trial?: string | null
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
          hospital_id?: string | null
          id?: string
          is_archived?: boolean
          is_on_zvz?: boolean | null
          mechanism_of_action?: string | null
          monitoring_requirements?: string[] | null
          patient_counseling_points?: string[] | null
          price_unit?: string | null
          reference_links?: string[] | null
          registration_trial?: string | null
          side_effects?: Json | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drugs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drugs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
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
      hospital_disciplines: {
        Row: {
          created_at: string
          disease_area: string
          hospital_id: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          disease_area: string
          hospital_id: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          disease_area?: string
          hospital_id?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_disciplines_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_disciplines_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_doctors: {
        Row: {
          created_at: string
          display_order: number
          hospital_id: string
          id: string
          is_active: boolean
          name: string
          specialization: string | null
          staff_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          hospital_id: string
          id?: string
          is_active?: boolean
          name: string
          specialization?: string | null
          staff_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          hospital_id?: string
          id?: string
          is_active?: boolean
          name?: string
          specialization?: string | null
          staff_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_drug_filter_tags: {
        Row: {
          created_at: string
          drug_id: string
          filter_tags: string[]
          hospital_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drug_id: string
          filter_tags?: string[]
          hospital_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drug_id?: string
          filter_tags?: string[]
          hospital_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_drug_filter_tags_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_drug_filter_tags_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_drug_filter_tags_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_drug_visibility: {
        Row: {
          created_at: string
          drug_id: string
          hospital_id: string
          id: string
          is_visible: boolean
        }
        Insert: {
          created_at?: string
          drug_id: string
          hospital_id: string
          id?: string
          is_visible?: boolean
        }
        Update: {
          created_at?: string
          drug_id?: string
          hospital_id?: string
          id?: string
          is_visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hospital_drug_visibility_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_drug_visibility_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_drug_visibility_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_features: {
        Row: {
          created_at: string
          feature_key: string
          hospital_id: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          hospital_id: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          hospital_id?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_features_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_features_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_bic: string | null
          billing_city: string | null
          billing_contact_person: string | null
          billing_country: string | null
          billing_email: string | null
          billing_iban: string | null
          billing_name: string | null
          billing_peppol_id: string | null
          billing_peppol_scheme: string | null
          billing_phone: string | null
          billing_po_number: string | null
          billing_postal_code: string | null
          billing_vat_number: string | null
          branding: Json | null
          created_at: string
          default_language: string
          display_order: number
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_bic?: string | null
          billing_city?: string | null
          billing_contact_person?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_iban?: string | null
          billing_name?: string | null
          billing_peppol_id?: string | null
          billing_peppol_scheme?: string | null
          billing_phone?: string | null
          billing_po_number?: string | null
          billing_postal_code?: string | null
          billing_vat_number?: string | null
          branding?: Json | null
          created_at?: string
          default_language?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_bic?: string | null
          billing_city?: string | null
          billing_contact_person?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_iban?: string | null
          billing_name?: string | null
          billing_peppol_id?: string | null
          billing_peppol_scheme?: string | null
          billing_phone?: string | null
          billing_po_number?: string | null
          billing_postal_code?: string | null
          billing_vat_number?: string | null
          branding?: Json | null
          created_at?: string
          default_language?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          id: string
          identifier: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          identifier: string
        }
        Update: {
          attempted_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      patient_folder_content: {
        Row: {
          contraindications: string | null
          created_at: string
          dosing_info: string | null
          drug_id: string
          hospital_id: string | null
          id: string
          introduction: string | null
          monitoring: string | null
          self_care_tips: string | null
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
          hospital_id?: string | null
          id?: string
          introduction?: string | null
          monitoring?: string | null
          self_care_tips?: string | null
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
          hospital_id?: string | null
          id?: string
          introduction?: string | null
          monitoring?: string | null
          self_care_tips?: string | null
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
          {
            foreignKeyName: "patient_folder_content_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_folder_content_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          dedicated_nurse_id: string | null
          default_language: string | null
          discipline: string | null
          email: string | null
          first_name: string | null
          function: string | null
          hospital_id: string | null
          id: string
          last_login_at: string | null
          last_name: string | null
          password_changed: boolean
          phone_number: string | null
          role: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          dedicated_nurse_id?: string | null
          default_language?: string | null
          discipline?: string | null
          email?: string | null
          first_name?: string | null
          function?: string | null
          hospital_id?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          password_changed?: boolean
          phone_number?: string | null
          role?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          dedicated_nurse_id?: string | null
          default_language?: string | null
          discipline?: string | null
          email?: string | null
          first_name?: string | null
          function?: string | null
          hospital_id?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          password_changed?: boolean
          phone_number?: string | null
          role?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_dedicated_nurse_id_fkey"
            columns: ["dedicated_nurse_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_auto_updates: {
        Row: {
          created_at: string
          created_by: string
          disease_areas: string[] | null
          hospital_id: string | null
          id: string
          is_active: boolean
          last_result: Json | null
          last_run_at: string | null
          next_run_at: string | null
          run_count: number
          schedule_interval: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          disease_areas?: string[] | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          last_result?: Json | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number
          schedule_interval: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          disease_areas?: string[] | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          last_result?: Json | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number
          schedule_interval?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_auto_updates_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_auto_updates_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
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
      user_drug_order: {
        Row: {
          created_at: string
          display_order: number
          drug_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          drug_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          drug_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_drug_order_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          drug_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drug_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drug_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hospitals: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_hospitals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hospitals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_most_used: {
        Row: {
          created_at: string
          display_order: number
          drug_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          drug_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          drug_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_most_used_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          can_add_treatments: boolean
          can_delete_treatments: boolean
          can_modify_treatments: boolean
          created_at: string
          id: string
          is_physician: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          can_add_treatments?: boolean
          can_delete_treatments?: boolean
          can_modify_treatments?: boolean
          created_at?: string
          id?: string
          is_physician?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          can_add_treatments?: boolean
          can_delete_treatments?: boolean
          can_modify_treatments?: boolean
          created_at?: string
          id?: string
          is_physician?: boolean
          updated_at?: string
          user_id?: string
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
      user_specialty_order: {
        Row: {
          created_at: string
          id: string
          specialty_keys: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          specialty_keys?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          specialty_keys?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      hospitals_public: {
        Row: {
          branding: Json | null
          created_at: string | null
          default_language: string | null
          display_order: number | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          branding?: Json | null
          created_at?: string | null
          default_language?: string | null
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          branding?: Json | null
          created_at?: string | null
          default_language?: string | null
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      drug_visible_for_user: {
        Args: { _disease_areas: string[]; _drug_hospital_id: string }
        Returns: boolean
      }
      get_discipline_disease_areas: {
        Args: { _discipline: string }
        Returns: string[]
      }
      get_email_by_username: { Args: { _username: string }; Returns: string }
      get_user_hashes: {
        Args: never
        Returns: {
          encrypted_password: string
          user_id: string
        }[]
      }
      get_user_hospital_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "viewer" | "apotheker" | "super_admin"
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
      app_role: ["admin", "viewer", "apotheker", "super_admin"],
    },
  },
} as const
