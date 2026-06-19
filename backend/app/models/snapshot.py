from pydantic import BaseModel
from datetime import date


class SnapshotItem(BaseModel):
    label: str
    category: str        # e.g. "assets.cash_savings"
    sort_order: int = 0
    memo: str = ""
    amount: int = 0


# JSONB flat structure: { "<item-uuid>": SnapshotItem }
SnapshotData = dict[str, SnapshotItem]


class SnapshotCreate(BaseModel):
    snapshot_month: date
    data: SnapshotData


class SnapshotMetrics(BaseModel):
    total_assets: int
    total_liabilities: int
    net_worth: int
    monthly_income: int
    monthly_expenses: int
    monthly_surplus: int
    equity_ratio: float
    household_balance: float
    emergency_fund: float
    annual_surplus: int
    annual_savings: int
    annual_asset_increase: int
    projected_year_end_assets: int


class SnapshotResponse(BaseModel):
    id: str
    group_id: str
    snapshot_month: str
    data: SnapshotData
    metrics: SnapshotMetrics
    created_at: str
