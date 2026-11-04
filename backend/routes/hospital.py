"""
Hospital & Doctor Metadata Route Handlers.
Enables multi-tenant hospital resolution, doctor roster queries, and branding retrieval.
"""

from typing import Any
from fastapi import APIRouter, Header, HTTPException, Query

from services.doctor_service import get_doctor, list_doctors
from services.hospital_service import (
    get_hospital,
    list_hospitals,
    resolve_hospital,
)

router = APIRouter(tags=["Hospital & Doctor Multi-Tenancy"])


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

