-- ============================================================================
-- EVOLUA CRM - Database Schema
-- Sistema de gerenciamento para fonoaudiólogos
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Clinics table
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  crfa TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users/Therapists table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  crfa TEXT,
  role TEXT NOT NULL DEFAULT 'therapist',
  avatar_url TEXT,
  areas_atuacao TEXT[],
  objetivos TEXT[],
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  cpf TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discharged', 'on-hold')),
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_relationship TEXT,
  address JSONB,
  medical_history JSONB,
  start_date TIMESTAMPTZ,
  discharge_date TIMESTAMPTZ,
  discharge_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  therapist_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  therapist_name TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  type TEXT NOT NULL CHECK (type IN ('evaluation', 'session', 'follow_up', 'reevaluation', 'parent_meeting', 'report_delivery')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  notes TEXT,
  cancellation_reason TEXT,
  cancellation_notes TEXT,
  cancelled_by TEXT,
  cancelled_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  session_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  therapist_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  therapist_name TEXT NOT NULL,
  therapist_crfa TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('evaluation', 'evolution', 'progress', 'discharge', 'monthly', 'school', 'medical', 'custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'reviewed', 'approved', 'sent', 'archived')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  period_start_date DATE,
  period_end_date DATE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_to TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON public.users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_therapist_id ON public.patients(therapist_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON public.appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(date_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

CREATE INDEX IF NOT EXISTS idx_reports_clinic_id ON public.reports(clinic_id);
CREATE INDEX IF NOT EXISTS idx_reports_patient_id ON public.reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_therapist_id ON public.reports(therapist_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Clinics policies
CREATE POLICY "Users can view their own clinic"
  ON public.clinics FOR SELECT
  USING (id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own clinic"
  ON public.clinics FOR UPDATE
  USING (id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- Users policies
CREATE POLICY "Users can view their own data"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own data"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Patients policies
CREATE POLICY "Users can view patients from their clinic"
  ON public.patients FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert patients to their clinic"
  ON public.patients FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update patients from their clinic"
  ON public.patients FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete patients from their clinic"
  ON public.patients FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- Appointments policies
CREATE POLICY "Users can view appointments from their clinic"
  ON public.appointments FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert appointments to their clinic"
  ON public.appointments FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update appointments from their clinic"
  ON public.appointments FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete appointments from their clinic"
  ON public.appointments FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- Reports policies
CREATE POLICY "Users can view reports from their clinic"
  ON public.reports FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert reports to their clinic"
  ON public.reports FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update reports from their clinic"
  ON public.reports FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete reports from their clinic"
  ON public.reports FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all tables
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FINANCIAL TABLES
-- ============================================================================

-- Transactions table
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT,
  therapist_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'cancelled')),
  due_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  notes TEXT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_clinic_id ON public.financial_transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_transactions_patient_id ON public.financial_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_therapist_id ON public.financial_transactions(therapist_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON public.financial_transactions(due_date);

-- Financial policies
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions from their clinic"
  ON public.financial_transactions FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert transactions to their clinic"
  ON public.financial_transactions FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update transactions from their clinic"
  ON public.financial_transactions FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete transactions from their clinic"
  ON public.financial_transactions FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- ============================================================================
-- TASKS TABLES
-- ============================================================================

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('clinical', 'admin', 'general')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_clinic_id ON public.tasks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tasks_therapist_id ON public.tasks(therapist_id);
CREATE INDEX IF NOT EXISTS idx_tasks_patient_id ON public.tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Tasks policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks from their clinic"
  ON public.tasks FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert tasks to their clinic"
  ON public.tasks FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update tasks from their clinic"
  ON public.tasks FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete tasks from their clinic"
  ON public.tasks FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- Patient reminders table
CREATE TABLE IF NOT EXISTS public.patient_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_avatar TEXT,
  therapist_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('birthday', 'contract', 'followup', 'appointment', 'payment')),
  message TEXT NOT NULL,
  action_label TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_clinic_id ON public.patient_reminders(clinic_id);
CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON public.patient_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_therapist_id ON public.patient_reminders(therapist_id);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON public.patient_reminders(type);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON public.patient_reminders(completed);

-- Reminders policies
ALTER TABLE public.patient_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reminders from their clinic"
  ON public.patient_reminders FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert reminders to their clinic"
  ON public.patient_reminders FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update reminders from their clinic"
  ON public.patient_reminders FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete reminders from their clinic"
  ON public.patient_reminders FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_reminders_updated_at BEFORE UPDATE ON public.patient_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
