from app.models.snapshot import SnapshotData, SnapshotMetrics


def _sum(section: dict[str, dict[str, int]], *keys: str) -> int:
    return sum(sum(section.get(k, {}).values()) for k in keys)


def calculate_metrics(data: SnapshotData) -> SnapshotMetrics:
    cash_total = _sum(data.assets, "cash_savings")
    total_assets = _sum(
        data.assets,
        "cash_savings", "investments", "insurance_pension", "real_estate", "personal_use",
    )  # ⓐ

    total_liabilities = _sum(data.liabilities, "short_term", "long_term")  # ⓑ
    net_worth = total_assets - total_liabilities  # ⓔ

    monthly_income = _sum(
        data.income,
        "employment", "business", "capital_gains", "interest_dividend",
        "rental", "pension_insurance", "other",
    )  # ⓒ

    savings_inv = _sum(data.expenses, "savings_investment")   # ②
    debt_repay = _sum(data.expenses, "debt_repayment")        # ③
    consumption = _sum(data.expenses, "fixed_consumption", "variable_consumption")  # ⑤
    monthly_expenses = savings_inv + debt_repay + consumption  # ⓓ
    monthly_surplus = monthly_income - monthly_expenses        # ⓡ

    equity_ratio = (net_worth / total_assets * 100) if total_assets > 0 else 0.0          # ⓕ
    household_balance = (consumption / monthly_income * 100) if monthly_income > 0 else 0.0  # ⓖ
    emergency_fund = (cash_total / consumption * 100) if consumption > 0 else 0.0            # ⓗ

    annual_surplus = monthly_surplus * 12         # ⓙ
    annual_savings = savings_inv * 12             # ⓚ
    annual_asset_increase = annual_surplus + annual_savings  # ⓜ
    projected_year_end_assets = total_assets + annual_asset_increase  # ⓝ

    return SnapshotMetrics(
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        net_worth=net_worth,
        monthly_income=monthly_income,
        monthly_expenses=monthly_expenses,
        monthly_surplus=monthly_surplus,
        equity_ratio=round(equity_ratio, 1),
        household_balance=round(household_balance, 1),
        emergency_fund=round(emergency_fund, 1),
        annual_surplus=annual_surplus,
        annual_savings=annual_savings,
        annual_asset_increase=annual_asset_increase,
        projected_year_end_assets=projected_year_end_assets,
    )
