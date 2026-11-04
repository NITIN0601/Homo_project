-- ==============================================================================
-- Agastya Classical Homeopathy EHR - Master Database Schema
-- Multi-Tenant & High-Concurrency (100+ Concurrent Requests)
-- Compatible with PostgreSQL 15+ and Self-Hosted / Cloud Supabase
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. Anti-Spam Control: Image & Camera Upload Hashes Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.uploaded_file_hashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_hash TEXT NOT NULL UNIQUE,
    file_name TEXT,
    file_size_bytes BIGINT,
    mime_type TEXT DEFAULT 'image/jpeg',
    uploaded_by TEXT DEFAULT 'mobile_worker',
    uploaded_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_uploaded_file_hashes_hash ON public.uploaded_file_hashes (file_hash);

-- ==============================================================================
-- 2. Core Clinical Table: patient_records
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.patient_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name TEXT NOT NULL,
    visiting_date DATE DEFAULT CURRENT_DATE NOT NULL,
    local_audio_path TEXT,
    prescription_image_path TEXT,
    homeopathic_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

-- GIN Index for fast JSONB querying & repertory lookup
CREATE INDEX IF NOT EXISTS idx_patient_records_homeopathic_analysis_gin 
ON public.patient_records USING gin (homeopathic_analysis);

CREATE INDEX IF NOT EXISTS idx_patient_records_patient_name 
ON public.patient_records (patient_name);

CREATE INDEX IF NOT EXISTS idx_patient_records_visiting_date 
ON public.patient_records (visiting_date DESC);

-- ==============================================================================
-- 3. Mobile Data Restriction View: mobile_patient_view
-- Drops raw local audio & image disk paths to enforce Wi-Fi mobile security
-- ==============================================================================
CREATE OR REPLACE VIEW public.mobile_patient_view AS
SELECT
    id,
    patient_name,
    visiting_date,
    homeopathic_analysis->'metadata' AS metadata,
    homeopathic_analysis->'patient_details' AS patient_details,
    homeopathic_analysis->'homeopathic_case_analysis'->'chief_complaints' AS chief_complaints,
    homeopathic_analysis->'homeopathic_case_analysis'->'generals_and_constitution' AS generals_and_constitution,
    homeopathic_analysis->'clinical_summary' AS clinical_summary,
    homeopathic_analysis->'treatment_plan'->'medicines_suggested' AS medicines_suggested,
    homeopathic_analysis->'treatment_plan'->'next_visit' AS next_visit,
    created_at
FROM public.patient_records;

-- ==============================================================================
-- 4. Clinic Appointments Table (Enforces Double-Booking Prevention SSOT)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    doctor_title TEXT DEFAULT 'Dr. Bramarambha K, MD (Homoeopathy)',
    status TEXT DEFAULT 'confirmed',
    calendar_sync_requested BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments (start_time);

-- High-Concurrency Atomic Constraint: Prevents double booking at the database level across all workers
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot_unique 
ON public.appointments (start_time, doctor_title) 
WHERE status != 'cancelled';

-- ==============================================================================
-- 5. Doctor Blocked Dates & Leave Schedule Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.doctor_blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    reason TEXT DEFAULT 'Doctor Leave / Clinic Closed',
    blocked_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON public.doctor_blocked_dates (date);

-- ==============================================================================
-- 6. Consultation Invoices & Billing Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.consultation_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_email TEXT,
    patient_phone TEXT,
    doctor_title TEXT DEFAULT 'Dr. Bramarambha K, MD (Homoeopathy)',
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    amount_inr NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid',
    payment_method TEXT,
    utr_number TEXT,
    notes TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.consultation_invoices (patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.consultation_invoices (status);

-- ==============================================================================
-- 7. User Authentication & OTP Verification Tables
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clinic_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'patient',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clinic_users_email ON public.clinic_users (email);

CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_lookup ON public.otp_verifications (email, otp_code, expires_at);

-- ==============================================================================
-- 8. Inventory & Medicine Catalogue Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    potency TEXT NOT NULL,
    formulation TEXT NOT NULL,
    price_inr NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'constitutional',
    stock_qty INTEGER NOT NULL DEFAULT 50,
    reorder_qty INTEGER NOT NULL DEFAULT 10,
    supplier TEXT DEFAULT 'SBL Pvt Ltd',
    last_restocked DATE DEFAULT CURRENT_DATE,
    expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '2 years'),
    batch_number TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

-- ==============================================================================
-- 9. Orders & Shipments Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal_inr NUMERIC(10,2) NOT NULL,
    shipping_inr NUMERIC(10,2) DEFAULT 0,
    tax_inr NUMERIC(10,2) DEFAULT 0,
    total_inr NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
    payment_details TEXT,
    courier_partner TEXT DEFAULT 'BlueDart Express 🚚',
    tracking_id TEXT,
    status TEXT DEFAULT 'processing',
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

-- ==============================================================================
-- 10. Row-Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_file_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Granular Security Policies
CREATE POLICY "Allow public select on inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Allow insert on appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select on appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Allow update on appointments" ON public.appointments FOR UPDATE USING (true);
CREATE POLICY "Allow select on blocked dates" ON public.doctor_blocked_dates FOR SELECT USING (true);
CREATE POLICY "Allow select on invoices" ON public.consultation_invoices FOR SELECT USING (true);
CREATE POLICY "Allow insert on invoices" ON public.consultation_invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on invoices" ON public.consultation_invoices FOR UPDATE USING (true);
CREATE POLICY "Allow insert on orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select on orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow hash check and insert for all" ON public.uploaded_file_hashes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow insert for all clinic users" ON public.patient_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view full patient records" ON public.patient_records FOR SELECT USING (true);

-- Role Permissions
GRANT SELECT ON public.inventory TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.appointments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_blocked_dates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.consultation_invoices TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.clinic_users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otp_verifications TO anon, authenticated;
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, INSERT ON public.uploaded_file_hashes TO anon, authenticated;
GRANT INSERT ON public.patient_records TO anon, authenticated;
GRANT SELECT ON public.mobile_patient_view TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

