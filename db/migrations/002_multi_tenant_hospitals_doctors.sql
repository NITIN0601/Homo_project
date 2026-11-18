-- ==============================================================================
-- Migration 002: Multi-Tenant Hospitals & Doctors Relational Schema
-- Enables full ACID compliance, foreign keys, and soft-delete capabilities
-- ==============================================================================

-- 1. Hospitals Table
CREATE TABLE IF NOT EXISTS public.hospitals (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT,
    tagline TEXT,
    domain TEXT,
    subdomains TEXT[] DEFAULT '{}',
    currency TEXT DEFAULT 'INR',
    currency_symbol TEXT DEFAULT '₹',
    contact JSONB NOT NULL DEFAULT '{}'::jsonb,
    branding JSONB NOT NULL DEFAULT '{}'::jsonb,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    hours JSONB NOT NULL DEFAULT '{}'::jsonb,
    legal JSONB DEFAULT '{}'::jsonb,
    logistics JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hospitals_slug ON public.hospitals (slug);
CREATE INDEX IF NOT EXISTS idx_hospitals_is_active ON public.hospitals (is_active);

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    title TEXT,
    qualifications TEXT,
    experience_years INTEGER DEFAULT 0,
    reg_no TEXT,
    license_id TEXT,
    specialties TEXT[] DEFAULT '{}',
    bio TEXT,
    consultation_fee NUMERIC(10,2) DEFAULT 500.00 NOT NULL,
    availability JSONB DEFAULT '{}'::jsonb,
    sharing_preferences JSONB DEFAULT '{}'::jsonb,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON public.doctors (hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_email ON public.doctors (email);
CREATE INDEX IF NOT EXISTS idx_doctors_is_active ON public.doctors (is_active);

-- 3. Add Hospital and Doctor Foreign Keys to Core Clinical Tables (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'hospital_id'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL;
        CREATE INDEX idx_appointments_hospital_id ON public.appointments (hospital_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'doctor_id'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN doctor_id TEXT REFERENCES public.doctors(id) ON DELETE SET NULL;
        CREATE INDEX idx_appointments_doctor_id ON public.appointments (doctor_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'consultation_invoices' AND column_name = 'hospital_id'
    ) THEN
        ALTER TABLE public.consultation_invoices ADD COLUMN hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL;
        CREATE INDEX idx_invoices_hospital_id ON public.consultation_invoices (hospital_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'patient_records' AND column_name = 'hospital_id'
    ) THEN
        ALTER TABLE public.patient_records ADD COLUMN hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL;
        CREATE INDEX idx_patient_records_hospital_id ON public.patient_records (hospital_id);
    END IF;
END $$;

-- 4. Enable RLS and Grant Permissions
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on active hospitals" ON public.hospitals FOR SELECT USING (is_active = true);
CREATE POLICY "Super admin full access on hospitals" ON public.hospitals FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select on active doctors" ON public.doctors FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access on doctors" ON public.doctors FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.hospitals TO anon, authenticated;
GRANT ALL ON public.hospitals TO service_role;
GRANT SELECT ON public.doctors TO anon, authenticated;
GRANT ALL ON public.doctors TO service_role;
