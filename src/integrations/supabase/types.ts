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
      applications: {
        Row: {
          id: string
          job_id: string | null
          user_id: string | null
          status: string | null
          applied_at: string | null
          cover_letter: string | null
          ats_score: number | null
          predicted_category: string | null
          confidence_score: number | null
          ats_calculated_at: string | null
        }
        Insert: {
          id?: string
          job_id?: string | null
          user_id?: string | null
          status?: string | null
          applied_at?: string | null
          cover_letter?: string | null
          ats_score?: number | null
          predicted_category?: string | null
          confidence_score?: number | null
          ats_calculated_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string | null
          user_id?: string | null
          status?: string | null
          applied_at?: string | null
          cover_letter?: string | null
          ats_score?: number | null
          predicted_category?: string | null
          confidence_score?: number | null
          ats_calculated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          id: string
          title: string
          company: string
          location: string
          type: string
          salary: string | null
          description: string
          requirements: string[]
          posted_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          company: string
          location: string
          type: string
          salary?: string | null
          description: string
          requirements?: string[]
          posted_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          company?: string
          location?: string
          type?: string
          salary?: string | null
          description?: string
          requirements?: string[]
          posted_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          user_type: string
          company: string | null
          position: string | null
          phone: string | null
          email: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          user_type: string
          company?: string | null
          position?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          user_type?: string
          company?: string | null
          position?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      resumes: {
        Row: {
          id: string
          user_id: string | null
          file_name: string
          file_path: string
          uploaded_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          file_name: string
          file_path: string
          uploaded_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          file_name?: string
          file_path?: string
          uploaded_at?: string | null
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          id: string
          job_id: string | null
          user_id: string | null
          saved_at: string | null
        }
        Insert: {
          id?: string
          job_id?: string | null
          user_id?: string | null
          saved_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string | null
          user_id?: string | null
          saved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: string
          viewer_user_id: string | null
          viewed_user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          viewer_user_id?: string | null
          viewed_user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          viewer_user_id?: string | null
          viewed_user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          id: string
          user_id: string | null
          skill: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          skill: string
        }
        Update: {
          id?: string
          user_id?: string | null
          skill?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
