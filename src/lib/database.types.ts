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
      activity_items: {
        Row: {
          created_at: string | null
          id: string
          text: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          text: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          text?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_at: string | null
          created_at: string | null
          follow_up_date: string | null
          id: string
          job_id: string
          notes: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          job_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_documents: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_path: string | null
          gaps: Json | null
          id: string
          parsed_education: Json | null
          parsed_experience: Json | null
          parsed_raw: Json | null
          parsed_skills: Json | null
          raw_text: string | null
          strengths: Json | null
          target_location: string | null
          target_title: string | null
          user_id: string
          work_preference: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          gaps?: Json | null
          id?: string
          parsed_education?: Json | null
          parsed_experience?: Json | null
          parsed_raw?: Json | null
          parsed_skills?: Json | null
          raw_text?: string | null
          strengths?: Json | null
          target_location?: string | null
          target_title?: string | null
          user_id: string
          work_preference?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          gaps?: Json | null
          id?: string
          parsed_education?: Json | null
          parsed_experience?: Json | null
          parsed_raw?: Json | null
          parsed_skills?: Json | null
          raw_text?: string | null
          strengths?: Json | null
          target_location?: string | null
          target_title?: string | null
          user_id?: string
          work_preference?: string | null
        }
        Relationships: []
      }
      job_listings: {
        Row: {
          company: string
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          match_breakdown: Json | null
          match_score: number | null
          posted_days_ago: number | null
          remote: boolean | null
          requirements: Json | null
          salary: string | null
          scam_reason: string | null
          scam_risk: Database["public"]["Enums"]["scam_risk"] | null
          scraped_at: string | null
          source: string | null
          title: string
          url: string | null
          user_id: string
          work_preference: string | null
        }
        Insert: {
          company: string
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          match_breakdown?: Json | null
          match_score?: number | null
          posted_days_ago?: number | null
          remote?: boolean | null
          requirements?: Json | null
          salary?: string | null
          scam_reason?: string | null
          scam_risk?: Database["public"]["Enums"]["scam_risk"] | null
          scraped_at?: string | null
          source?: string | null
          title: string
          url?: string | null
          user_id: string
          work_preference?: string | null
        }
        Update: {
          company?: string
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          match_breakdown?: Json | null
          match_score?: number | null
          posted_days_ago?: number | null
          remote?: boolean | null
          requirements?: Json | null
          salary?: string | null
          scam_reason?: string | null
          scam_risk?: Database["public"]["Enums"]["scam_risk"] | null
          scraped_at?: string | null
          source?: string | null
          title?: string
          url?: string | null
          user_id?: string
          work_preference?: string | null
        }
        Relationships: []
      }
      interview_preparations: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          questions: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          questions?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          questions?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          created_at: string | null
          id: string
          messages: Json | null
          prep_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          prep_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          prep_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          education: Json | null
          email: string | null
          experience: Json | null
          full_name: string | null
          gaps: Json | null
          id: string
          location: string | null
          skills: Json | null
          strengths: Json | null
          summary: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          education?: Json | null
          email?: string | null
          experience?: Json | null
          full_name?: string | null
          gaps?: Json | null
          id: string
          location?: string | null
          skills?: Json | null
          strengths?: Json | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          education?: Json | null
          email?: string | null
          experience?: Json | null
          full_name?: string | null
          gaps?: Json | null
          id?: string
          location?: string | null
          skills?: Json | null
          strengths?: Json | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      application_status: "saved" | "applied" | "interview" | "offer" | "rejected"
      scam_risk: "low" | "medium" | "high"
    }
    CompositeTypes: {}
  }
}