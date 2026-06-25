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
      altas: {
        Row: {
          contact_name: string
          created_at: string
          domain: string | null
          domain_is_custom: boolean
          existing_website_url: string | null
          gmb_place_id: string | null
          has_existing_website: boolean
          id: string
          onetime_fee_amount: number | null
          onetime_fee_concept:
            | Database["public"]["Enums"]["alta_fee_concept"]
            | null
          restaurant_address: string | null
          restaurant_name: string
          status: Database["public"]["Enums"]["alta_status"]
          stripe_session_id: string | null
          wants_custom_domain: boolean
          whatsapp: string
        }
        Insert: {
          contact_name: string
          created_at?: string
          domain?: string | null
          domain_is_custom?: boolean
          existing_website_url?: string | null
          gmb_place_id?: string | null
          has_existing_website?: boolean
          id?: string
          onetime_fee_amount?: number | null
          onetime_fee_concept?:
            | Database["public"]["Enums"]["alta_fee_concept"]
            | null
          restaurant_address?: string | null
          restaurant_name: string
          status?: Database["public"]["Enums"]["alta_status"]
          stripe_session_id?: string | null
          wants_custom_domain?: boolean
          whatsapp: string
        }
        Update: {
          contact_name?: string
          created_at?: string
          domain?: string | null
          domain_is_custom?: boolean
          existing_website_url?: string | null
          gmb_place_id?: string | null
          has_existing_website?: boolean
          id?: string
          onetime_fee_amount?: number | null
          onetime_fee_concept?:
            | Database["public"]["Enums"]["alta_fee_concept"]
            | null
          restaurant_address?: string | null
          restaurant_name?: string
          status?: Database["public"]["Enums"]["alta_status"]
          stripe_session_id?: string | null
          wants_custom_domain?: boolean
          whatsapp?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_alta: {
        Args: {
          p_restaurant_name: string
          p_restaurant_address: string | null
          p_gmb_place_id: string | null
          p_has_existing_website: boolean
          p_existing_website_url: string | null
          p_wants_custom_domain: boolean
          p_domain: string | null
          p_domain_is_custom: boolean
          p_onetime_fee_concept: Database["public"]["Enums"]["alta_fee_concept"] | null
          p_onetime_fee_amount: number | null
          p_contact_name: string
          p_whatsapp: string
        }
        Returns: string
      }
      mark_alta_paid: {
        Args: {
          p_alta_id: string
          p_stripe_session_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      alta_fee_concept: "gestion" | "dominio"
      alta_status: "pending_payment" | "paid"
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
      alta_fee_concept: ["gestion", "dominio"],
      alta_status: ["pending_payment", "paid"],
    },
  },
} as const
