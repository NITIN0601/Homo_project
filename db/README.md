# Database Architecture & Schema Management

This directory contains the database definitions, migration scripts, and seed fixtures for the **Agastya Classical Homeopathy EHR** system. The database is built on PostgreSQL 15+ and is natively compatible with both self-hosted Supabase containers and cloud-managed Supabase / PostgreSQL instances.

---

## Directory Organization

```
db/
├── schema.sql                 # Master consolidated production DDL schema
├── migrations/                # Version-controlled incremental migration files
│   └── 001_initial_schema.sql # Core tables, GIN indexes, RLS policies, views
├── seeds/                     # Baseline fixture datasets
│   └── 001_seed_initial_data.sql # Default inventory & admin/patient accounts
└── README.md                  # This documentation
```

---

## Schema Overview

| Table / View | Description | Key Indexes / Constraints |
| :--- | :--- | :--- |
| `public.patient_records` | Clinical EHR consultations & repertory analysis | `idx_patient_records_homeopathic_analysis_gin` (GIN index on JSONB) |
| `public.appointments` | Atomic scheduling and calendar reservations | `idx_appointments_slot_unique` (prevents double-booking at DB level) |
| `public.doctor_blocked_dates` | Doctor leave and clinic holiday schedules | Unique constraint on `date` |
| `public.consultation_invoices` | Patient billing, UPI transaction tracking, receipts | Indexed on `patient_id` and `status` |
| `public.inventory` | Remedy catalogue stock levels and reorders | Primary key `id`, tracked `stock_qty` and `reorder_qty` |
| `public.orders` | Medicine dispensary dispatch and courier tracking | Indexed on customer and order status |
| `public.clinic_users` | User credentials, salted password hashes, and roles | Unique constraint on `email` |
| `public.otp_verifications` | Time-expiring OTP authentication tokens | Composite index on `(email, otp_code, expires_at)` |
| `public.uploaded_file_hashes` | Anti-spam deduplication for patient attachments | Unique SHA-256 `file_hash` |
| `public.mobile_patient_view` | Sanitized read view stripping raw disk paths | HIPAA-compliant view for mobile workers |

---

## High-Concurrency & Security Guardrails

1. **Atomic Double-Booking Prevention**:
   ```sql
   CREATE UNIQUE INDEX idx_appointments_slot_unique 
   ON public.appointments (start_time, doctor_title) 
   WHERE status != 'cancelled';
   ```
   Guarantees that two concurrent booking requests for the exact same slot cannot succeed simultaneously even under heavy load.

2. **JSONB GIN Indexing**:
   Repertory rubrics and symptom analysis are stored inside `patient_records.homeopathic_analysis` with a PostgreSQL GIN index, enabling sub-millisecond symptom and remedy searches across thousands of clinical files.

3. **Row-Level Security (RLS)**:
   Every table is protected by PostgreSQL RLS. Non-admin roles (patients, mobile clinic workers) can only access authorized subsets or sanitized views.

---

## How to Apply Migrations Locally

### Option 1: Via Docker Compose (Automated)
When starting the local Docker stack:
```bash
docker compose -f infra/docker-compose.yml up -d db
```
The PostgreSQL container automatically runs all `.sql` scripts placed in `/docker-entrypoint-initdb.d/`.

### Option 2: Direct PostgreSQL Connection
```bash
psql -h localhost -p 5432 -U postgres -d postgres -f db/schema.sql
psql -h localhost -p 5432 -U postgres -d postgres -f db/seeds/001_seed_initial_data.sql
```

### Option 3: Supabase Cloud Migration
```bash
# Push to Supabase Cloud CLI
supabase db push
```

