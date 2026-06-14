from fastapi import APIRouter, HTTPException
from app.models.snapshot import SnapshotCreate, SnapshotData, SnapshotResponse
from app.services.calculations import calculate_metrics
from app.db import local_store as store

router = APIRouter()


@router.get("/", response_model=list[SnapshotResponse])
def list_snapshots():
    return [_to_response(r) for r in store.get_all_snapshots()]


@router.post("/", response_model=SnapshotResponse, status_code=201)
def create_snapshot(body: SnapshotCreate):
    metrics = calculate_metrics(body.data)
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
    return _to_response(store.save_snapshot(row))


@router.get("/{snapshot_id}", response_model=SnapshotResponse)
def get_snapshot(snapshot_id: str):
    row = store.get_snapshot(snapshot_id)
    if not row:
        raise HTTPException(status_code=404, detail="스냅샷 없음")
    return _to_response(row)


@router.delete("/{snapshot_id}", status_code=204)
def delete_snapshot(snapshot_id: str):
    store.delete_snapshot(snapshot_id)


def _to_response(row: dict) -> SnapshotResponse:
    data = SnapshotData(**row["data"])
    return SnapshotResponse(
        id=row["id"],
        snapshot_month=row["snapshot_month"],
        data=data,
        metrics=calculate_metrics(data),
        created_at=row["created_at"],
    )
