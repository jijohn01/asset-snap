from fastapi import APIRouter
from app.api.v1.endpoints import snapshots, user_items

router = APIRouter(prefix="/v1")
router.include_router(snapshots.router, prefix="/snapshots", tags=["snapshots"])
router.include_router(user_items.router, prefix="/user-items", tags=["user-items"])
