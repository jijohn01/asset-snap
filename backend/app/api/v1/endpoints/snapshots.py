from fastapi import APIRouter, Header, HTTPException
from app.models.snapshot import SnapshotCreate, SnapshotItem, SnapshotResponse
from app.services.calculations import calculate_metrics
from app.db import supabase as db

router = APIRouter()


def _require_user(x_user_id: str | None) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-ID 헤더 필요")
    return x_user_id


def _require_role(group_id: str, user_id: str, *allowed: str) -> None:
    role = db.get_member_role(group_id, user_id)
    if role not in allowed:
        raise HTTPException(status_code=403, detail="권한 없음")


@router.get("/", response_model=list[SnapshotResponse])
def list_snapshots(group_id: str, x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner", "editor", "viewer")
    return [_to_response(r) for r in db.get_snapshots(group_id)]


@router.post("/", response_model=SnapshotResponse, status_code=201)
def create_snapshot(group_id: str, body: SnapshotCreate, x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner", "editor")
    metrics = calculate_metrics(body.data)
    row = db.upsert_snapshot(
        group_id=group_id,
        snapshot_month=body.snapshot_month.isoformat(),
        data={item_id: item.model_dump() for item_id, item in body.data.items()},
        metrics=metrics.model_dump(),
        created_by=user_id,
    )
    return _to_response(row)


@router.get("/prefill", response_model=dict[str, SnapshotItem])
def get_prefill(group_id: str, month: str, x_user_id: str | None = Header(default=None)):
    """신규 스냅샷 폼 초기화: 직전 스냅샷 데이터를 그대로 반환."""
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner", "editor", "viewer")
    prev = db.get_prev_snapshot_data(group_id, month)
    return prev or {}


@router.get("/{snapshot_id}", response_model=SnapshotResponse)
def get_snapshot(group_id: str, snapshot_id: str, x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner", "editor", "viewer")
    row = db.get_snapshot(snapshot_id)
    if not row or row["group_id"] != group_id:
        raise HTTPException(status_code=404, detail="스냅샷 없음")
    return _to_response(row)


@router.put("/{snapshot_id}", response_model=SnapshotResponse)
def update_snapshot(
    group_id: str, snapshot_id: str, body: SnapshotCreate,
    x_user_id: str | None = Header(default=None),
):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner", "editor")
    existing = db.get_snapshot(snapshot_id)
    if not existing or existing["group_id"] != group_id:
        raise HTTPException(status_code=404, detail="스냅샷 없음")
    metrics = calculate_metrics(body.data)
    row = db.upsert_snapshot(
        group_id=group_id,
        snapshot_month=body.snapshot_month.isoformat(),
        data={item_id: item.model_dump() for item_id, item in body.data.items()},
        metrics=metrics.model_dump(),
        created_by=user_id,
    )
    return _to_response(row)


@router.delete("/{snapshot_id}", status_code=204)
def delete_snapshot(group_id: str, snapshot_id: str, x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner", "editor")
    existing = db.get_snapshot(snapshot_id)
    if not existing or existing["group_id"] != group_id:
        raise HTTPException(status_code=404, detail="스냅샷 없음")
    db.delete_snapshot(snapshot_id)


def _to_response(row: dict) -> SnapshotResponse:
    data = {item_id: SnapshotItem(**item) for item_id, item in row["data"].items()}
    return SnapshotResponse(
        id=row["id"],
        group_id=row["group_id"],
        snapshot_month=str(row["snapshot_month"]),
        data=data,
        metrics=calculate_metrics(data),
        created_at=str(row["created_at"]),
    )
