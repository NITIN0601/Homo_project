# Agastya Homoeopathy Clinic — Engineering Documentation Hub

Welcome to the technical documentation for **Agastya Homoeopathy Clinic EHR** (Project Suspense). This system is a high-concurrency, HIPAA-conscious clinical operating system designed for on-premise and hybrid cloud deployments, supporting 100+ concurrent parallel interactions across doctors and patients.

---

## 📚 Documentation Index

| Document | Description | Target Audience |
| :--- | :--- | :--- |
| **[1. System Architecture](file:///Users/nitin/Desktop/Project_Suspense/doc/ARCHITECTURE.md)** | Vertical slice architecture, 100+ user concurrency engine, database SSOT, HIPAA security boundaries, and audit logging. | Architects, Senior Engineers |
| **[2. Wiring & Data Flow](file:///Users/nitin/Desktop/Project_Suspense/doc/WIRING_AND_DATA_FLOW.md)** | End-to-end trace from UI components through React Context, API client, FastAPI routers to PostgreSQL. | Full-Stack Engineers |
| **[3. Developer Cheatsheet ("Where to Touch Code")](file:///Users/nitin/Desktop/Project_Suspense/doc/DEVELOPER_CHEATSHEET.md)** | Step-by-step guide on modifying routes, schema, theme colors, clinic metadata, and data fixtures. | All Developers |
| **[4. Run & Test Guide](file:///Users/nitin/Desktop/Project_Suspense/doc/RUN_AND_TEST_GUIDE.md)** | How to run frontend & backend separately, environment variables, load testing, and Vitest suite. | DevOps, QA, Developers |
| **[5. JEV & AI Orchestration Evaluation](file:///Users/nitin/Desktop/Project_Suspense/doc/JEV_AND_AI_ORCHESTRATION.md)** | Analysis of TypeSafe AI's Jev model, LangChain/LangGraph evaluation (why it is overengineering here), and deterministic clinical decision support. | AI Engineers, Architects |
| **[6. Multi-Hospital Design System Plan](file:///Users/nitin/Desktop/Project_Suspense/doc/MULTI_HOSPITAL_DESIGN_SYSTEM_PLAN.md)** | Enterprise multi-hospital white-label architecture: dynamic theming, domain & JWT tenant resolvers, HIPAA multi-hospital PHI isolation, and base UI primitives. | Architects, Frontend Leads |
| **[7. Phase 1: UI Primitives & Tokens](file:///Users/nitin/Desktop/Project_Suspense/doc/slices/PHASE1_UI_PRIMITIVES_AND_TOKENS.md)** | Specification for zero-dependency `cn` utility, base UI primitives (`Button`, `Badge`, `Card`, `Input`, `Modal`, `Tabs`, `Typography`). | Frontend Engineers |
| **[8. Phase 2: Multi-Tenant Core](file:///Users/nitin/Desktop/Project_Suspense/doc/slices/PHASE2_MULTI_TENANT_CORE.md)** | Dual tenant resolution engine (Option A: Domain/Subdomain + Option B: Auth JWT), `ThemeProvider`, and backend tenant isolation guard. | Full-Stack Engineers |
| **[9. Phase 3-7: Slices Migration](file:///Users/nitin/Desktop/Project_Suspense/doc/slices/PHASE3_SLICES_MIGRATION.md)** | Step-by-step migration guide for Navigation, Scheduling, Pharmacy, Medical Records, and Admin Dashboard slices. | All Developers |
| **[10. Phase 4: Deduplication & SSOT](file:///Users/nitin/Desktop/Project_Suspense/doc/slices/PHASE4_DEDUPLICATION_AND_SSOT.md)** | Full codebase audit, dead code elimination, modal unification, and centralized PHI scoping. | Full-Stack Engineers |
| **[11. Phase 5: Dynamic Tenant Customization & Scalability](file:///Users/nitin/Desktop/Project_Suspense/doc/slices/PHASE5_DYNAMIC_TENANT_CUSTOMIZATION.md)** | Enterprise multi-hospital/multi-doctor scalability audit, admin feature toggles (payments, raw JSON case view), branding, and stability fixes. | Full-Stack Engineers, Architects |
| **[12. Customer & Admin Portals Architecture Review & Tree Map](file:///Users/nitin/Desktop/Project_Suspense/doc/PORTALS_CODE_AND_ARCHITECTURE_REVIEW.md)** | Comprehensive High Level (HLD) & Low Level Design (LLD) review of both Customer and Admin/Doctor portals, complete parent-child tree map, feature cascading, modal geometry, and code file mapping matrix. | Architects, Frontend & Full-Stack Leads |

---

## 🏛️ Quick Architectural Summary

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS. Uses a centralized reactive state machine (`AppContext.tsx`) with zero hardcoded mock data in code files.
- **Backend**: FastAPI (Python 3.14) decomposed into 6 independent vertical slices (`slices/auth`, `scheduling`, `clinical_records`, `dispensary`, `billing`, `communications`).
- **Data Persistence (SSOT)**: Local PostgreSQL / Supabase with database-level partial unique index preventing slot double-booking, and atomic file-locking disk fallback.
- **Security & Privacy**: PBKDF2 password hashing, HMAC-SHA256 JWT tokens, role-based access control (Doctor Admin vs. Patient), and HIPAA PHI tenant isolation wall.
- **Traceability**: `AuditTraceMiddleware` attaching forensic `X-Trace-ID` and `X-Session-ID` to all requests, with real-time administrator alerts on security violations.

