"""
Central API Routes Assembly.
Exposes all domain routers for FastAPI main application.
"""

from routes.auth import router as auth_router
from routes.billing import router as billing_router
from routes.clinical_records import router as clinical_router
from routes.communications import router as communications_router
from routes.dispensary import router as dispensary_router
from routes.hospital import router as hospital_router
from routes.scheduling import router as scheduling_router

__all__ = [
    "auth_router",
    "billing_router",
    "clinical_router",
    "communications_router",
    "dispensary_router",
    "hospital_router",
    "scheduling_router",
]

