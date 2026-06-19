from app.services.calculations import calculate_metrics
from app.models.snapshot import SnapshotItem

SAMPLE_DATA = {
    "item-1": SnapshotItem(label="CMA", category="assets.cash_savings", sort_order=0, memo="", amount=5000),
    "item-2": SnapshotItem(label="주식", category="assets.investments", sort_order=1, memo="", amount=3000),
    "item-3": SnapshotItem(label="대출", category="liabilities.long_term", sort_order=0, memo="", amount=2000),
    "item-4": SnapshotItem(label="월급", category="income.employment", sort_order=0, memo="", amount=400),
    "item-5": SnapshotItem(label="생활비", category="expenses.fixed_consumption", sort_order=0, memo="", amount=200),
    "item-6": SnapshotItem(label="저축", category="expenses.savings_investment", sort_order=1, memo="", amount=100),
}


def test_net_worth():
    metrics = calculate_metrics(SAMPLE_DATA)
    assert metrics.net_worth == 6000  # 8000 assets - 2000 liabilities


def test_monthly_surplus():
    metrics = calculate_metrics(SAMPLE_DATA)
    assert metrics.monthly_surplus == 100  # 400 income - 300 expenses


def test_equity_ratio():
    metrics = calculate_metrics(SAMPLE_DATA)
    assert metrics.equity_ratio == 75.0  # 6000/8000 * 100


def test_empty_snapshot():
    metrics = calculate_metrics({})
    assert metrics.net_worth == 0
    assert metrics.equity_ratio == 0.0
    assert metrics.monthly_surplus == 0
