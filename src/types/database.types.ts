export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: {
          id: string
          name: string
          cnpj: string | null
          address: string | null
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          cnpj?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          clinic_id: string
          email: string
          full_name: string
          role: string
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          email: string
          full_name: string
          role?: string
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          email?: string
          full_name?: string
          role?: string
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          clinic_id: string
          therapist_id: string
          full_name: string
          date_of_birth: string | null
          cpf: string | null
          rg: string | null
          gender: string | null
          phone: string | null
          email: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          notes: string | null
          avatar_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          therapist_id: string
          full_name: string
          date_of_birth?: string | null
          cpf?: string | null
          rg?: string | null
          gender?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          notes?: string | null
          avatar_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          therapist_id?: string
          full_name?: string
          date_of_birth?: string | null
          cpf?: string | null
          rg?: string | null
          gender?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          notes?: string | null
          avatar_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          therapist_id: string
          date_time: string
          duration_minutes: number
          status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          type: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          therapist_id: string
          date_time: string
          duration_minutes?: number
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          type?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          therapist_id?: string
          date_time?: string
          duration_minutes?: number
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          type?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          therapist_id: string
          appointment_id: string | null
          title: string
          content: string
          report_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          therapist_id: string
          appointment_id?: string | null
          title: string
          content: string
          report_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          therapist_id?: string
          appointment_id?: string | null
          title?: string
          content?: string
          report_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      financial_transactions: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string | null
          patient_name: string | null
          therapist_id: string
          type: 'income' | 'expense'
          category: string
          description: string
          amount: number
          payment_method: string | null
          status: 'paid' | 'pending' | 'overdue' | 'cancelled'
          due_date: string | null
          paid_date: string | null
          notes: string | null
          appointment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id?: string | null
          patient_name?: string | null
          therapist_id: string
          type: 'income' | 'expense'
          category: string
          description: string
          amount: number
          payment_method?: string | null
          status?: 'paid' | 'pending' | 'overdue' | 'cancelled'
          due_date?: string | null
          paid_date?: string | null
          notes?: string | null
          appointment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string | null
          patient_name?: string | null
          therapist_id?: string
          type?: 'income' | 'expense'
          category?: string
          description?: string
          amount?: number
          payment_method?: string | null
          status?: 'paid' | 'pending' | 'overdue' | 'cancelled'
          due_date?: string | null
          paid_date?: string | null
          notes?: string | null
          appointment_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          clinic_id: string
          therapist_id: string
          patient_id: string | null
          title: string
          description: string | null
          type: 'clinical' | 'admin' | 'general'
          status: 'pending' | 'completed' | 'overdue' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          completed_at: string | null
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          therapist_id: string
          patient_id?: string | null
          title: string
          description?: string | null
          type: 'clinical' | 'admin' | 'general'
          status?: 'pending' | 'completed' | 'overdue' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          completed_at?: string | null
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          therapist_id?: string
          patient_id?: string | null
          title?: string
          description?: string | null
          type?: 'clinical' | 'admin' | 'general'
          status?: 'pending' | 'completed' | 'overdue' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          completed_at?: string | null
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      patient_reminders: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          patient_name: string
          patient_avatar: string | null
          therapist_id: string
          type: 'birthday' | 'contract' | 'followup' | 'appointment' | 'payment'
          message: string
          action_label: string
          due_date: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          patient_name: string
          patient_avatar?: string | null
          therapist_id: string
          type: 'birthday' | 'contract' | 'followup' | 'appointment' | 'payment'
          message: string
          action_label: string
          due_date?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          patient_name?: string
          patient_avatar?: string | null
          therapist_id?: string
          type?: 'birthday' | 'contract' | 'followup' | 'appointment' | 'payment'
          message?: string
          action_label?: string
          due_date?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      update_updated_at_column: {
        Args: {}
        Returns: unknown
      }
    }
    Enums: {}
  }
}
