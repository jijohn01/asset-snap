from fastapi import APIRouter
from app.api.v1.endpoints import snapshots

router = APIRouter(prefix="/v1")
router.include_router(snapshots.router, prefix="/snapshots", tags=["snapshots"])
