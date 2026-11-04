# Phase 2: Multi-Hospital Tenant Core & Strict PHI Isolation

## Overview
Phase 2 establishes the multi-hospital foundation. It enables the system to dynamically resolve the active hospital tenant via both **Option A (Domain/Subdomain)** and **Option B (Auth/JWT Token Context)**, while enforcing **strict HIPAA PHI tenant isolation** across databases, APIs, and clinical interfaces.

---

## 1. Dual Tenant Resolution Architecture

```
Incoming Request
  │
  ├─► Option A: Domain / Hostname Resolution
  │    Is hostname mapped to a hospital slug? (e.g. agastya.clinic.com, apollo.telecare.com)
  │    YES ──► Set activeTenantId = matchedTenantId
  │    NO  ──┐
  │          │
  ├─► Option B: Auth JWT / Header Resolution
  │    Does Bearer Token / X-Hospital-ID header specify an authorized hospital?
  │    YES ──► Set activeTenantId = tokenHospitalId
  │    NO  ──┐
  │          │
  └─► Fallback: Default Hospital Tenant (.env: DEFAULT_HOSPITAL_ID="agastya")
```

### TypeScript Resolver Implementation
```typescript
// src/services/tenantResolver.ts
export function resolveActiveHospitalTenant(
  hostname: string,
  userAuthorizedHospitals?: string[],
  activeUserHospital?: string
): string {
  // Option B: If user is logged in and explicitly switched hospital context
  if (activeUserHospital && userAuthorizedHospitals?.includes(activeUserHospital)) {
    return activeUserHospital;
  }

  // Option A: Domain / Subdomain matching
  const cleanHost = hostname.toLowerCase().split(":")[0];
  if (cleanHost.includes("agastya") || cleanHost === "localhost") {
    return "agastya";
  }
  if (cleanHost.includes("cityhospital") || cleanHost.includes("apollo")) {
    return "apollo";
  }

  return import.meta.env.VITE_DEFAULT_HOSPITAL_ID || "agastya";
}
```

---

## 2. Dynamic CSS Custom Properties Injection (`ThemeProvider`)

When the active tenant is resolved, the `ThemeProvider` injects that hospital's colors and formatting tokens directly into `:root`:

```tsx
// src/context/ThemeProvider.tsx
export const ThemeProvider: React.FC<{ tenant: HospitalTenantConfig; children: React.ReactNode }> = ({
  tenant,
  children
}) => {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", tenant.branding.primaryColor);
    root.style.setProperty("--brand-primary-dark", tenant.branding.primaryDarkColor);
    root.style.setProperty("--brand-accent", tenant.branding.accentColor);
    root.style.setProperty("--radius-card", tenant.branding.cardRadius);
    root.style.setProperty("--radius-button", tenant.branding.buttonRadius);
    root.style.setProperty("--font-sans", tenant.branding.fontSans);
    document.title = `${tenant.name} — ${tenant.tagline}`;
  }, [tenant]);

  return <>{children}</>;
};
```

---

## 3. Strict HIPAA PHI Multi-Hospital Tenant Isolation

### 1. Database & State Partitioning Rule
Every clinical record, appointment, prescription, order, and invoice has a required `hospital_id` field.
```sql
-- Schema enforcement
ALTER TABLE booked_appointments ADD COLUMN hospital_id VARCHAR(64) NOT NULL DEFAULT 'agastya';
ALTER TABLE patient_medical_files ADD COLUMN hospital_id VARCHAR(64) NOT NULL DEFAULT 'agastya';
ALTER TABLE visit_summaries ADD COLUMN hospital_id VARCHAR(64) NOT NULL DEFAULT 'agastya';
ALTER TABLE consultation_invoices ADD COLUMN hospital_id VARCHAR(64) NOT NULL DEFAULT 'agastya';

CREATE INDEX idx_appointments_tenant ON booked_appointments(hospital_id, date);
CREATE INDEX idx_medical_files_tenant ON patient_medical_files(hospital_id, patient_id);
```

### 2. Backend Tenant Middleware & PHI Guard
In [`backend/core/auth_middleware.py`](file:///Users/nitin/Desktop/Project_Suspense/backend/core/auth_middleware.py):
1. Reads `X-Hospital-ID` header and verifies it against the authenticated user's `hospital_id` claims.
2. Injects `current_hospital_id` into FastAPI request state: `request.state.hospital_id`.
3. In [`backend/slices/clinical_records/router.py`](file:///Users/nitin/Desktop/Project_Suspense/backend/slices/clinical_records/router.py):
   ```python
   @router.get("/patients/{patient_id}/visits")
   async def get_patient_visits(patient_id: str, request: Request, user=Depends(get_current_user)):
       tenant_id = getattr(request.state, "hospital_id", "agastya")
       # Query strictly filters by patient_id AND hospital_id
       visits = db.query(VisitSummary).filter_by(patient_id=patient_id, hospital_id=tenant_id).all()
       return visits
   ```
   **Result**: Even if Patient `usr-001` has visits in both Hospital A and Hospital B, accessing Hospital A will NEVER leak Hospital B's prescriptions, clinical notes, or billing invoices.

### 3. Doctor Admin Boundary
- Admin credentials for Dr. Nitin Dhiman are bound strictly to `hospital_id == "agastya"`.
- Attempting to query patient records for any other hospital returns `403 Forbidden` with an automated security audit event logged in `backend/core/audit.py`.

---

## 4. Verification & Testing Gate
1. **Unit Test**: Test tenant resolver with mock hostnames (`agastya.com`, `apollo.com`, `localhost`).
2. **Integration Test**: Create two mock patients at two different hospital tenants. Verify that API calls for Tenant A do not return Tenant B records.
3. **Audit Trail Test**: Verify that unauthorized cross-hospital queries trigger `add_admin_alert()` and return HTTP 403.

