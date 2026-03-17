from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# ==================== AUTH ====================

class UserCreate(BaseModel):
    username: str
    password: str
    telegram_id: Optional[int] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    telegram_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# ==================== CATEGORIES ====================

class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: str
    color: str

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str
    icon: str = "📦"
    color: str = "#6B7280"


# ==================== TRANSACTIONS ====================

class TransactionCreate(BaseModel):
    amount: float
    type: str  # "income" ou "expense"
    description: str = ""
    category_id: Optional[int] = None
    payment_type: str = "debit"
    card_id: Optional[int] = None
    created_at: Optional[datetime] = None


class TransactionResponse(BaseModel):
    id: int
    amount: float
    type: str
    description: str
    category_id: Optional[int]
    payment_type: str
    card_id: Optional[int]
    user_id: int
    created_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


# ==================== REPORTS ====================

class SummaryResponse(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    transaction_count: int


class CategorySummary(BaseModel):
    category_id: int
    category_name: str
    category_icon: str
    category_color: str
    total: float
    percentage: float


class MonthlyEvolution(BaseModel):
    month: int
    year: int
    income: float
    expense: float


# ==================== SALARY CONFIG ====================


class SalaryConfigCreate(BaseModel):
    total_amount: float
    has_two_parts: bool = False
    part1_amount: float
    part1_day: int  # 1-31
    part2_amount: Optional[float] = None
    part2_day: Optional[int] = None


class SalaryConfigResponse(BaseModel):
    id: int
    total_amount: float
    has_two_parts: bool
    part1_amount: float
    part1_day: int
    part2_amount: Optional[float]
    part2_day: Optional[int]

    class Config:
        from_attributes = True


class SalaryPaymentInfo(BaseModel):
    target_day: int
    original_date: str
    payment_date: str
    payment_day: int
    is_adjusted: bool
    skip_reason: Optional[str]
    weekday: str
    amount: Optional[float] = None


class SalaryMonthCalendar(BaseModel):
    month: int
    year: int
    month_name: str
    total_amount: float
    part1: SalaryPaymentInfo
    part2: Optional[SalaryPaymentInfo] = None


# ==================== CATEGORY BUDGETS ====================


class CategoryBudgetCreate(BaseModel):
    category_id: int
    budget_amount: float


class CategoryBudgetResponse(BaseModel):
    id: int
    category_id: int
    budget_amount: float

    class Config:
        from_attributes = True


# ==================== MONTHLY DETAIL ====================


class CategoryMonthlyDetail(BaseModel):
    category_id: int
    category_name: str
    category_icon: str
    category_color: str
    total: float
    budget: Optional[float]
    percentage_used: Optional[float]
    status: str  # "none" | "ok" | "warning" | "danger" | "over"
    transaction_count: int


# ==================== GASTOS RECORRENTES ====================

class RecurringExpenseCreate(BaseModel):
    name: str
    category_id: Optional[int] = None
    amount: float
    due_day: int
    bank_name: Optional[str] = None
    payment_type: str = "pix"  # pix | debit | credit | bank_transfer
    is_active: bool = True


class RecurringExpenseResponse(BaseModel):
    id: int
    name: str
    category_id: Optional[int]
    category: Optional[CategoryResponse] = None
    amount: float
    due_day: int
    bank_name: Optional[str]
    payment_type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BankGroupSummary(BaseModel):
    group_name: str          # bank name or payment_type label
    group_type: str          # "bank" | "payment_type"
    total_amount: float
    expense_count: int
    expenses: List[RecurringExpenseResponse]


# ==================== CARTÕES DE CRÉDITO ====================

class CreditCardAccountCreate(BaseModel):
    bank_name: str
    card_name: str
    closing_day: int
    due_day: int
    color: str = "#6366F1"
    icon: str = "💳"


class CreditCardAccountResponse(BaseModel):
    id: int
    bank_name: str
    card_name: str
    closing_day: int
    due_day: int
    color: str
    icon: str
    is_active: bool

    class Config:
        from_attributes = True


class CardInstallmentCreate(BaseModel):
    card_id: int
    description: str
    total_amount: float
    monthly_amount: float
    total_installments: int
    paid_installments: int = 0
    start_date: Optional[datetime] = None
    category_id: Optional[int] = None


class CardInstallmentResponse(BaseModel):
    id: int
    card_id: int
    description: str
    total_amount: float
    monthly_amount: float
    total_installments: int
    paid_installments: int
    remaining_installments: int
    start_date: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


class CardSubscriptionCreate(BaseModel):
    card_id: int
    description: str
    monthly_amount: float
    category_id: Optional[int] = None
    is_active: bool = True


class CardSubscriptionResponse(BaseModel):
    id: int
    card_id: int
    description: str
    monthly_amount: float
    is_active: bool
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


class CardMonthData(BaseModel):
    month: int
    year: int
    fatura_atual: float      # installments active this month
    gastos_variaveis: float  # one-time variable transactions
    assinaturas: float       # active subscriptions
    total: float


class CardMonthlyView(BaseModel):
    card: CreditCardAccountResponse
    months: List[CardMonthData]
    total_installments_monthly: float
    total_subscriptions_monthly: float


# ==================== EMPRÉSTIMOS ====================

class LoanCreate(BaseModel):
    bank_name: Optional[str] = None
    name: str
    total_amount: float
    installment_amount: float
    total_installments: int
    paid_installments: int = 0
    due_day: int
    start_date: Optional[datetime] = None


class LoanResponse(BaseModel):
    id: int
    bank_name: Optional[str]
    name: str
    total_amount: float
    installment_amount: float
    total_installments: int
    paid_installments: int
    remaining_installments: int
    due_day: int
    start_date: datetime
    is_active: bool

    class Config:
        from_attributes = True


class LoanMonthItem(BaseModel):
    month: int
    year: int
    month_name: str
    installment_number: int
    amount: float
    is_paid: bool


class LoanSchedule(BaseModel):
    loan: LoanResponse
    schedule: List[LoanMonthItem]


# ==================== ORÇAMENTO SEMANAL ====================

class WeeklyBudgetCreate(BaseModel):
    amount: float


class WeeklyBudgetResponse(BaseModel):
    id: int
    amount: float

    class Config:
        from_attributes = True


class WeekEntry(BaseModel):
    week_label: str
    start_date: str
    end_date: str
    budget: float
    spent: float
    remaining: float
    percentage: float
    is_current: bool


# ==================== GASTOS DA ESPOSA / REEMBOLSO ====================


class PartnerExpenseCreate(BaseModel):
    description: str
    amount: float
    source: Optional[str] = None
    note: Optional[str] = None
    charge_date: Optional[datetime] = None
    is_paid: bool = False
    is_installment: bool = False
    installment_number: Optional[int] = None
    total_installments: Optional[int] = None


class PartnerExpenseResponse(BaseModel):
    id: int
    description: str
    amount: float
    source: Optional[str]
    note: Optional[str]
    charge_date: datetime
    is_paid: bool
    is_installment: bool
    installment_number: Optional[int]
    total_installments: Optional[int]
    installment_group: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== FLUXO DIÁRIO ====================

class DailyFlowItem(BaseModel):
    date: str
    day_of_week: str
    income: float
    recurring_expenses: float
    variable_expenses: float
    total_expense: float
    net: float
    running_balance: float
    is_today: bool
    is_future: bool
    salary_part: Optional[str] = None   # "part1" | "part2" | None
    events: List[str]


# ==================== CENÁRIOS DE GASTO ====================

class ScenarioItemCreate(BaseModel):
    category_name: str
    icon: str = "📦"
    estimated_amount: float


class ScenarioItemResponse(BaseModel):
    id: int
    category_name: str
    icon: str
    estimated_amount: float

    class Config:
        from_attributes = True


class ScenarioCreate(BaseModel):
    name: str
    icon: str = "🎯"
    color: str = "#6366F1"
    month: int
    year: int
    notes: Optional[str] = None
    items: List[ScenarioItemCreate] = []


class ScenarioUpdate(BaseModel):
    name: str
    icon: str = "🎯"
    color: str = "#6366F1"
    notes: Optional[str] = None
    items: List[ScenarioItemCreate] = []


class ScenarioResponse(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    month: int
    year: int
    notes: Optional[str]
    total_estimated: float
    items: List[ScenarioItemResponse]
    created_at: datetime

    class Config:
        from_attributes = True


class ScenarioMonthlyImpact(BaseModel):
    month: int
    year: int
    scenario_count: int
    total_planned: float
    scenarios: List[ScenarioResponse]
