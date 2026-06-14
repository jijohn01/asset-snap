from fastapi import APIRouter, HTTPException
from app.models.snapshot import SnapshotCreate, SnapshotResponse
from app.services.calculations import calculate_metrics
from app.db.supabase import get_supabase

router = APIRouter()


@router.get("/", response_model=list[SnapshotResponse])
async def list_snapshots():
    db = get_supabase()
    result = db.table("snapshots").select("*").order("snapshot_month", desc=True).execute()
    return _to_responses(result.data)


@router.post("/", response_model=SnapshotResponse, status_code=201)
async def create_snapshot(body: SnapshotCreate):
    metrics = calculate_metrics(body.data)
    db = get_supabase()
    row = {
        "snapshot_month": body.snapshot_month.isoformat(),
        "data": body.data.model_dump(),
        "total_assets": metrics.total_assets,
        "total_liabilities": metrics.total_liabilities,
        "net_worth": metrics.net_worth,
        "monthly_income": metrics.monthly_income,
        "monthly_expenses": metrics.monthly_expenses,
        "monthly_surplus": metrics.monthly_surplus,
    }
    result = db.table("snapshots").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="저장 실패")
    return _to_response(result.data[0], metrics)


@router.get("/{snapshot_id}", response_model=SnapshotResponse)
async def get_snapshot(snapshot_id: str):
    db = get_supabase()
    result = db.table("snapshots").select("*").eq("id", snapshot_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="스냅샷 없음")
    from app.models.snapshot import SnapshotData
    data = SnapshotData(**result.data["data"])
    metrics = calculate_metrics(data)
    return _to_response(result.data, metrics)


@router.delete("/{snapshot_id}", status_code=204)
async def delete_snapshot(snapshot_id: str):
    db = get_supabase()
    db.table("snapshots").delete().eq("id", snapshot_id).execute()


def _to_response(row: dict, metrics=None):
    from app.models.snapshot import SnapshotData
    data = SnapshotData(**row["data"])
    if metrics is None:
        metrics = calculate_metrics(data)
    return SnapshotResponse(
        id=row["id"],
        snapshot_month=row["snapshot_month"],
        data=data,
        metrics=metrics,
        created_at=row["created_at"],
    )


def _to_responses(rows: list[dict]):
    return [_to_response(r) for r in rows]
