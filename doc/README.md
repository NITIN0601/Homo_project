# Homo_project — Engineering Documentation Hub

[![GitHub Repository](https://img.shields.io/badge/GitHub-Homo__project-blue?logo=github)](https://github.com/NITIN0601/Homo_project)
[![Maintainer](https://img.shields.io/badge/Maintainer-NITIN0601-green?logo=github)](https://github.com/NITIN0601)

Welcome to the technical documentation for **[Homo_project](https://github.com/NITIN0601/Homo_project)**. This platform is a high-concurrency, HIPAA-conscious clinical operating system and multi-tenant EHR designed for on-premise and hybrid cloud deployments, supporting 100+ concurrent parallel interactions across doctors and patients.

---

## 📚 Documentation Index

| Document | Description | Target Audience |
| :--- | :--- | :--- |
| **[1. System Architecture](ARCHITECTURE.md)** | Vertical slice architecture, 100+ user concurrency engine, database SSOT, HIPAA security boundaries, and audit logging. | Architects, Senior Engineers |
| **[2. Wiring & Data Flow](WIRING_AND_DATA_FLOW.md)** | End-to-end trace from UI components through React Context, API client, FastAPI routers to PostgreSQL. | Full-Stack Engineers |
| **[3. Developer Cheatsheet](DEVELOPER_CHEATSHEET.md)** | Step-by-step guide on modifying routes, schema, theme colors, clinic metadata, and data fixtures. | All Developers |
| **[4. Run & Test Guide](RUN_AND_TEST_GUIDE.md)** | How to run frontend & backend separately, environment variables, load testing, and Vitest suite. | DevOps, QA, Developers |
| **[5. JEV & AI Orchestration](JEV_AND_AI_ORCHESTRATION.md)** | Analysis of TypeSafe AI's Jev model, deterministic clinical decision support, and LLM scribe integration. | AI Engineers, Architects |
| **[6. Multi-Hospital Design System Plan](MULTI_HOSPITAL_DESIGN_SYSTEM_PLAN.md)** | Enterprise multi-hospital white-label architecture: dynamic theming, domain & JWT tenant resolvers, and HIPAA PHI isolation. | Architects, Frontend Leads |
| **[7. Phase 1: UI Primitives & Tokens](slices/PHASE1_UI_PRIMITIVES_AND_TOKENS.md)** | Specification for zero-dependency `cn` utility, base UI primitives (`Button`, `Badge`, `Card`, `Input`, `Modal`, `Tabs`, `Typography`). | Frontend Engineers |
| **[8. Phase 2: Multi-Tenant Core](slices/PHASE2_MULTI_TENANT_CORE.md)** | Dual tenant resolution engine (Option A: Domain/Subdomain + Option B: Auth JWT), `ThemeProvider`, and backend tenant isolation guard. | Full-Stack Engineers |
| **[9. Phase 3: Slices Migration](slices/PHASE3_SLICES_MIGRATION.md)** | Migration guide for Navigation, Scheduling, Pharmacy, Medical Records, and Admin Dashboard slices. | All Developers |
| **[10. Phase 4: Deduplication & SSOT](slices/PHASE4_DEDUPLICATION_AND_SSOT.md)** | Full codebase audit, dead code elimination, modal unification, and centralized PHI scoping. | Full-Stack Engineers |
| **[11. Phase 5: Dynamic Tenant Customization](slices/PHASE5_DYNAMIC_TENANT_CUSTOMIZATION.md)** | Multi-hospital/multi-doctor scalability audit, admin feature toggles, branding, and stability fixes. | Full-Stack Engineers, Architects |
| **[12. Portals Architecture Review & Tree Map](PORTALS_CODE_AND_ARCHITECTURE_REVIEW.md)** | Comprehensive High Level (HLD) & Low Level Design (LLD) review of Customer and Admin/Doctor portals, complete tree map, and code file mapping matrix. | Architects, Full-Stack Leads |

---

## 🏛️ Quick Architectural Summary

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 in `frontend/`. Uses centralized reactive state (`AppContext.tsx`) with dynamic tenant provider (`ThemeProvider.tsx`).
- **Backend**: FastAPI (Python 3.14) decomposed into modular routers in `backend/routes/` and business services in `backend/services/`.
- **Database (SSOT)**: PostgreSQL 15+ / Supabase managed via `db/schema.sql` and `db/migrations/`, featuring GIN indexes for JSONB repertory analysis and database-level double-booking prevention.
- **3-Tier Governance & RBAC**: `super_admin` (cross-hospital platform manager), `admin` (clinic director/doctor), and `patient`/`guest`. Phase 1 limits: 5 super admins, 10 admins, 1000 customers per clinic.
- **Security & Privacy**: PBKDF2 password hashing, HMAC-SHA256 JWT tokens, role-based access control, and HIPAA-compliant `mobile_patient_view`.
- **Traceability**: `AuditTraceMiddleware` attaching forensic `X-Trace-ID`, `X-Session-ID`, and `X-Hospital-ID` to all requests, with real-time audit logging.
- **Automated Verification**: Comprehensive 113-test backend test suite (`./test/run_tests.sh`) and Vitest client suite.
