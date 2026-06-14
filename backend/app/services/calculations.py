from app.models.snapshot import SnapshotData, SnapshotMetrics


def calculate_metrics(data: SnapshotData) -> SnapshotMetrics:
    a = data.assets
    l = data.liabilities
    inc = data.income
    exp = data.expenses

    # ── 자산 합계 ──────────────────────────────────────────
    cash_total = sum(a.cash_savings.model_dump().values())
    invest_total = sum(a.investments.model_dump().values())
    pension_total = sum(a.insurance_pension.model_dump().values())
    realestate_total = sum(a.real_estate.model_dump().values())
    personal_total = sum(a.personal_use.model_dump().values())
    total_assets = cash_total + invest_total + pension_total + realestate_total + personal_total  # ⓐ

    # ── 부채 합계 ──────────────────────────────────────────
    short_total = sum(l.short_term.model_dump().values())
    long_total = sum(l.long_term.model_dump().values())
    total_liabilities = short_total + long_total  # ⓑ

    # ── 순자산 ────────────────────────────────────────────
    net_worth = total_assets - total_liabilities  # ⓔ

    # ── 월 소득 합계 ──────────────────────────────────────
    monthly_income = (
        sum(inc.employment.model_dump().values())
        + sum(inc.business.model_dump().values())
        + inc.capital_gains_stocks
        + inc.capital_gains_real_estate
        + sum(inc.interest_dividend.model_dump().values())
        + inc.rental
        + inc.pension_insurance
        + inc.other
    )  # ⓒ

    # ── 월 지출 합계 ──────────────────────────────────────
    savings_inv_total = sum(exp.savings_investment.model_dump().values())   # ②
    debt_repay_total = sum(exp.debt_repayment.model_dump().values())        # ③
    fixed_total = sum(exp.fixed_consumption.model_dump().values())
    variable_total = sum(exp.variable_consumption.model_dump().values())
    consumption_total = fixed_total + variable_total  # ⑤ (소비성 지출)
    monthly_expenses = savings_inv_total + debt_repay_total + consumption_total  # ⓓ

    monthly_surplus = monthly_income - monthly_expenses  # ⓡ

    # ── 핵심 지표 ─────────────────────────────────────────
    equity_ratio = (net_worth / total_assets * 100) if total_assets > 0 else 0.0           # ⓕ
    household_balance = (consumption_total / monthly_income * 100) if monthly_income > 0 else 0.0  # ⓖ
    emergency_fund = (cash_total / consumption_total * 100) if consumption_total > 0 else 0.0      # ⓗ
    loan_interest = exp.fixed_consumption.loan_interest
    debt_repayment_ratio = ((debt_repay_total + loan_interest) / net_worth * 100) if net_worth > 0 else 0.0  # ⓘ

    annual_surplus = monthly_surplus * 12          # ⓙ
    annual_savings = savings_inv_total * 12        # ⓚ
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
        debt_repayment_ratio=round(debt_repayment_ratio, 1),
        annual_surplus=annual_surplus,
        annual_savings=annual_savings,
        annual_asset_increase=annual_asset_increase,
        projected_year_end_assets=projected_year_end_assets,
    )
