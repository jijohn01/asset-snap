from pydantic import BaseModel
from datetime import date


class CashSavings(BaseModel):
    checking: int = 0
    cma: int = 0
    cma2: int = 0
    savings: int = 0
    other: int = 0


class Investments(BaseModel):
    stocks_bonds: int = 0
    stocks_bonds2: int = 0
    subscription_savings: int = 0
    other: int = 0


class InsurancePension(BaseModel):
    term_accident: int = 0
    whole_life: int = 0
    pension_savings: int = 0
    retirement_pension: int = 0
    other: int = 0


class RealEstate(BaseModel):
    house: int = 0
    land_commercial: int = 0
    other: int = 0


class PersonalUse(BaseModel):
    residential: int = 0
    lease_deposit: int = 0
    car: int = 0
    other: int = 0


class Assets(BaseModel):
    cash_savings: CashSavings = CashSavings()
    investments: Investments = Investments()
    insurance_pension: InsurancePension = InsurancePension()
    real_estate: RealEstate = RealEstate()
    personal_use: PersonalUse = PersonalUse()


class ShortTermLiabilities(BaseModel):
    credit_installment: int = 0
    overdraft: int = 0
    personal_loan: int = 0
    car_installment: int = 0
    lease_deposit: int = 0


class LongTermLiabilities(BaseModel):
    mortgage: int = 0
    jeonse_loan: int = 0
    other: int = 0


class Liabilities(BaseModel):
    short_term: ShortTermLiabilities = ShortTermLiabilities()
    long_term: LongTermLiabilities = LongTermLiabilities()


class Employment(BaseModel):
    salary: int = 0
    other: int = 0


class Business(BaseModel):
    youtube: int = 0
    lecture: int = 0
    a: int = 0
    b: int = 0
    c: int = 0
    other: int = 0


class InterestDividend(BaseModel):
    savings_interest: int = 0
    stock_dividend: int = 0
    other: int = 0


class Income(BaseModel):
    employment: Employment = Employment()
    business: Business = Business()
    capital_gains_stocks: int = 0
    capital_gains_real_estate: int = 0
    interest_dividend: InterestDividend = InterestDividend()
    rental: int = 0
    pension_insurance: int = 0
    other: int = 0


class SavingsInvestment(BaseModel):
    savings: int = 0
    stocks_funds: int = 0
    pension: int = 0


class DebtRepayment(BaseModel):
    principal: int = 0
    other: int = 0


class FixedConsumption(BaseModel):
    loan_interest: int = 0
    utilities: int = 0
    management_fee: int = 0
    insurance: int = 0
    monthly_rent: int = 0
    telecom: int = 0
    subscription: int = 0
    other: int = 0


class VariableConsumption(BaseModel):
    food: int = 0
    necessities: int = 0
    education_culture: int = 0
    transportation: int = 0
    medical_beauty: int = 0
    other: int = 0


class Expenses(BaseModel):
    savings_investment: SavingsInvestment = SavingsInvestment()
    debt_repayment: DebtRepayment = DebtRepayment()
    fixed_consumption: FixedConsumption = FixedConsumption()
    variable_consumption: VariableConsumption = VariableConsumption()


class SnapshotData(BaseModel):
    assets: Assets = Assets()
    liabilities: Liabilities = Liabilities()
    income: Income = Income()
    expenses: Expenses = Expenses()


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
    debt_repayment_ratio: float  # ⓘ 총부채상환지표
    annual_surplus: int        # ⓙ 연간 잉여자금
    annual_savings: int        # ⓚ 연간 저축/투자액
    annual_asset_increase: int # ⓜ 연간 자산증가
    projected_year_end_assets: int  # ⓝ 연말 예상 자산


class SnapshotResponse(BaseModel):
    id: str
    snapshot_month: date
    data: SnapshotData
    metrics: SnapshotMetrics
    created_at: str
