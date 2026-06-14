from pydantic import BaseModel
from datetime import date


class SnapshotData(BaseModel):
    assets: dict[str, dict[str, int]] = {}
    liabilities: dict[str, dict[str, int]] = {}
    income: dict[str, dict[str, int]] = {}
    expenses: dict[str, dict[str, int]] = {}


class UserItem(BaseModel):
    id: str
    category: str
    label: str
    sort_order: int = 0
    memo: str = ""


class UserItemCreate(BaseModel):
    category: str
    label: str
    sort_order: int = 0
    memo: str = ""


class UserItemUpdate(BaseModel):
    label: str | None = None
    sort_order: int | None = None
    memo: str | None = None


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
    equity_ratio: float        # ⓕ 자기자본비율
    household_balance: float   # ⓖ 가계수지지표
    emergency_fund: float      # ⓗ 비상예비자금지표
    annual_surplus: int        # ⓙ 연간 잉여자금
    annual_savings: int        # ⓚ 연간 저축/투자액
    annual_asset_increase: int # ⓜ 연간 자산증가
    projected_year_end_assets: int  # ⓝ 연말 예상 자산


class SnapshotResponse(BaseModel):
    id: str
    snapshot_month: str
    data: SnapshotData
    metrics: SnapshotMetrics
    created_at: str
