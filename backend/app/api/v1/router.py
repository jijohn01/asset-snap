from fastapi import APIRouter
from app.api.v1.endpoints import snapshots, asset_groups

router = APIRouter(prefix="/v1")
router.include_router(asset_groups.router, prefix="/asset-groups", tags=["asset-groups"])
# 스냅샷은 장부(asset-group) 하위 리소스
router.include_router(
    snapshots.router,
    prefix="/asset-groups/{group_id}/snapshots",
    tags=["snapshots"],
)
