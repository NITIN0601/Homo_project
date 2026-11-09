"""
Hospital & Doctor Metadata Route Handlers.
Enables multi-tenant hospital resolution, doctor roster queries, and branding retrieval.
"""

from datetime import datetime, timezone

from core.config import settings
from core.security import require_admin_role, require_super_admin_role
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from schemas.hospital import (
    DevModeToggleRequest,
    DoctorCreateRequest,
    HospitalCreateRequest,
)
from services.doctor_service import create_doctor, get_doctor, list_doctors
from services.hospital_service import (
    create_hospital,
    get_hospital,
    list_hospitals,
    resolve_hospital,
    save_hospital,
)

router = APIRouter(tags=["Hospital & Doctor Multi-Tenancy"])


@router.post("/hospitals", summary="Create a new hospital tenant (Super Admin only)")
async def create_hospital_endpoint(
    req: HospitalCreateRequest,
    user: dict = Depends(require_super_admin_role),
):
    """Platform Super Admin: Registers a new hospital tenant with branding and features."""
    try:
        new_h = create_hospital(req.model_dump())
        return {"status": "created", "hospital": new_h}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/doctors", summary="Register a new doctor in hospital roster (Admin only)")
async def create_doctor_endpoint(
    req: DoctorCreateRequest,
    user: dict = Depends(require_admin_role),
):
    """Admin / Super Admin: Provisions a doctor profile for the designated hospital."""
    try:
        new_doc = create_doctor(req.model_dump())
        return {"status": "created", "doctor": new_doc}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/platform/toggle-dev-mode", summary="Toggle Mock Data vs Real Database (Super Admin only)")
async def toggle_dev_mode_endpoint(
    req: DevModeToggleRequest,
    user: dict = Depends(require_super_admin_role),
):
    """Platform Super Admin: Dynamically switches backend between Mock Dev Mode and Real DB."""
    settings.USE_MOCK_DATA = req.use_mock_data
    return {
        "status": "updated",
        "use_mock_data": settings.USE_MOCK_DATA,
        "mode": "Developer Mock Mode" if settings.USE_MOCK_DATA else "Production Database Mode",
    }


@router.get("/hospitals", summary="List all active hospital tenants")
async def list_hospitals_endpoint(active_only: bool = Query(default=True)):
    """Returns list of registered hospital/clinic tenants."""
    return list_hospitals(active_only=active_only)


@router.get("/hospitals/active", summary="Resolve active hospital from request headers or subdomain")
async def get_active_hospital_endpoint(
    x_tenant_id: str | None = Header(None, alias="X-Tenant-ID"),
    host: str | None = Header(None),
):
    """
    Returns active hospital configuration resolved from X-Tenant-ID header, host domain, or default.
    """
    headers = {}
    if x_tenant_id:
        headers["x-tenant-id"] = x_tenant_id
    if host:
        headers["host"] = host
    return resolve_hospital(headers=headers)


@router.get("/hospitals/{hospital_id}", summary="Get hospital tenant by ID or slug")
async def get_hospital_endpoint(hospital_id: str):
    """Retrieves hospital profile, branding, contacts, and features."""
    h = get_hospital(hospital_id)
    if not h:
        raise HTTPException(status_code=404, detail=f"Hospital '{hospital_id}' not found")
    return h


@router.get("/hospitals/{hospital_id}/doctors", summary="List doctors for a specific hospital")
async def list_hospital_doctors_endpoint(hospital_id: str, active_only: bool = Query(default=True)):
    """Returns doctors roster for the specified hospital."""
    return list_doctors(hospital_id=hospital_id, active_only=active_only)


@router.get("/doctors", summary="List all doctors across hospital network")
async def list_all_doctors_endpoint(
    hospital_id: str | None = Query(default=None),
    active_only: bool = Query(default=True),
):
    """Returns doctors roster, optionally filtered by hospital."""
    return list_doctors(hospital_id=hospital_id, active_only=active_only)


@router.get("/doctors/{doctor_id}", summary="Get doctor profile by ID")
async def get_doctor_endpoint(doctor_id: str):
    """Retrieves doctor qualifications, license ID, specialties, and bio."""
    d = get_doctor(doctor_id)
    if not d:
        raise HTTPException(status_code=404, detail=f"Doctor '{doctor_id}' not found")
    return d


@router.get("/hospitals/{hospital_id}/features", summary="Get active feature flags for hospital")
async def get_hospital_features(hospital_id: str):
    """Returns live feature flag state for the hospital tenant."""
    hospital = get_hospital(hospital_id)
    return {
        "hospital_id": hospital_id,
        "features": hospital.get("features", {}),
        "updated_at": hospital.get("updatedAt"),
    }


@router.patch("/hospitals/{hospital_id}/features", summary="Update feature flags (admin only)")
async def update_hospital_features(
    hospital_id: str,
    features: dict[str, bool],
    user: dict = Depends(require_admin_role),
):
    """Admin-only: Atomically updates feature flags and persists to hospital tenant config."""
    hospital = get_hospital(hospital_id)
    current_features = hospital.get("features", {})
    updated_features = {**current_features, **features}
    updated_record = {
        **hospital,
        "features": updated_features,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    save_hospital(updated_record)
    return {"status": "updated", "hospital_id": hospital_id, "features": updated_features}


