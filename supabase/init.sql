-- ==============================================================================
-- Agastya Classical Homeopathy Clinic - Self-Hosted Supabase Complete Schema
-- Configured for On-Premise Admin PC & Local Wi-Fi Mobile Clients
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
-- 4. Clinic Appointments Table
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

-- ==============================================================================
-- 5. Inventory & Medicine Catalogue Table
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
-- 6. Orders & Shipments Table
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
-- 7. Seed Initial Inventory from Codebase Defaults
-- ==============================================================================
INSERT INTO public.inventory (id, name, potency, formulation, price_inr, category, stock_qty, reorder_qty, supplier, batch_number)
VALUES
    ('m1', 'Arnica Montana', '30C', 'Globules 4g', 160.00, 'acute', 45, 10, 'SBL Pvt Ltd', 'BTH-M1-2026'),
    ('m2', 'Lycopodium Clavatum', '200C', 'Globules 4g', 210.00, 'constitutional', 12, 10, 'Boiron India', 'BTH-M2-2026'),
    ('m3', 'Nux Vomica', '30C', 'Drops 30ml', 140.00, 'acute', 88, 10, 'Reckeweg India', 'BTH-M3-2026'),
    ('m4', 'Sulphur', '200C', 'Globules 4g', 195.00, 'constitutional', 5, 10, 'SBL Pvt Ltd', 'BTH-M4-2026'),
    ('m5', 'Belladonna', '6C', 'Globules 4g', 120.00, 'acute', 30, 10, 'Schwabe India', 'BTH-M5-2026'),
    ('m6', 'Natrum Muriaticum', '200C', 'Globules 4g', 220.00, 'constitutional', 67, 10, 'SBL Pvt Ltd', 'BTH-M6-2026'),
    ('m7', 'Calcarea Fluorica', '6X', 'Tissue Salt', 185.00, 'tissue-salt', 9, 10, 'Reckeweg India', 'BTH-M7-2026'),
    ('m8', 'Silicea', '12X', 'Tissue Salt', 175.00, 'tissue-salt', 22, 10, 'Schwabe India', 'BTH-M8-2026')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 8. Row-Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_file_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow insert and read on standard clinic tables
CREATE POLICY "Allow public select on inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Allow insert on appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select on appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Allow insert on orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select on orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow hash check and insert for all" ON public.uploaded_file_hashes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow insert for all clinic users" ON public.patient_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view full patient records" ON public.patient_records FOR SELECT USING (true);

-- Permissions
GRANT SELECT ON public.inventory TO anon, authenticated;
GRANT SELECT, INSERT ON public.appointments TO anon, authenticated;
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, INSERT ON public.uploaded_file_hashes TO anon, authenticated;
GRANT INSERT ON public.patient_records TO anon, authenticated;
GRANT SELECT ON public.mobile_patient_view TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
