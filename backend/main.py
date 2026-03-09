import threading
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime
from typing import Optional, List

from database import engine, get_db, SessionLocal, Base
from models import (
    User, Category, Transaction, SalaryConfig, CategoryBudget,
    RecurringExpense, CreditCardAccount, CardInstallment, CardSubscription,
    Loan, WeeklyBudget, Scenario, ScenarioItem,
)
from business_days import get_salary_payment_info, MONTHS_PT
from schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    CategoryCreate, CategoryResponse,
    TransactionCreate, TransactionResponse,
    SummaryResponse, CategorySummary, MonthlyEvolution,
    SalaryConfigCreate, SalaryConfigResponse, SalaryMonthCalendar,
    CategoryBudgetCreate, CategoryBudgetResponse, CategoryMonthlyDetail,
    RecurringExpenseCreate, RecurringExpenseResponse, BankGroupSummary,
    CreditCardAccountCreate, CreditCardAccountResponse,
    CardInstallmentCreate, CardInstallmentResponse,
    CardSubscriptionCreate, CardSubscriptionResponse,
    CardMonthlyView, CardMonthData,
    LoanCreate, LoanResponse, LoanSchedule, LoanMonthItem,
    WeeklyBudgetCreate, WeeklyBudgetResponse, WeekEntry,
    DailyFlowItem,
    ScenarioCreate, ScenarioUpdate, ScenarioResponse, ScenarioItemCreate,
    ScenarioMonthlyImpact,
)
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
)
from config import CORS_ORIGINS

# ==================== APP ====================

app = FastAPI(title="💰 Finanças API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Categorias padrão
DEFAULT_CATEGORIES = [
    {"name": "Cartões Gastos",  "icon": "💳", "color": "#6366F1"},
    {"name": "Empréstimos",     "icon": "🏦", "color": "#DC2626"},
    {"name": "Investimentos",   "icon": "📈", "color": "#10B981"},
    {"name": "Uber/99/Taxi",    "icon": "🚕", "color": "#F59E0B"},
    {"name": "Restaurante",     "icon": "🍽️", "color": "#EF4444"},
    {"name": "Mercados/Feiras", "icon": "🛒", "color": "#84CC16"},
    {"name": "iFood",           "icon": "🛵", "color": "#FF6900"},
    {"name": "Ajudas em Geral", "icon": "🤝", "color": "#A855F7"},
    {"name": "Presentes",       "icon": "🎁", "color": "#EC4899"},
    {"name": "Lazer",           "icon": "🎮", "color": "#06B6D4"},
    {"name": "Saúde",           "icon": "💊", "color": "#16A34A"},
    {"name": "CPTM",            "icon": "🚇", "color": "#3B82F6"},
    {"name": "Itens de Lazer",  "icon": "🎯", "color": "#8B5CF6"},
    {"name": "E-Commerce",      "icon": "📦", "color": "#F97316"},
    {"name": "Renda",           "icon": "💰", "color": "#22C55E"},
    {"name": "Ajuda",           "icon": "❤️",  "color": "#F43F5E"},
]


@app.get("/")
def health_check():
    return {"status": "ok", "app": "Finanças API"}


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing_names = {c.name for c in db.query(Category).all()}
        added = 0
        for cat_data in DEFAULT_CATEGORIES:
            if cat_data["name"] not in existing_names:
                db.add(Category(**cat_data))
                added += 1
        if added:
            db.commit()
            print(f"✅ {added} categorias adicionadas!")
    finally:
        db.close()

    # Inicia o bot do Telegram em thread separada
    from config import TELEGRAM_BOT_TOKEN
    if TELEGRAM_BOT_TOKEN:
        def _run_bot():
            try:
                from bot import main as bot_main
                bot_main()
            except Exception as e:
                print(f"❌ Erro no bot Telegram: {e}")
        bot_thread = threading.Thread(target=_run_bot, daemon=True)
        bot_thread.start()
        print("🤖 Bot do Telegram iniciado em background!")
    else:
        print("⚠️  TELEGRAM_BOT_TOKEN não configurado — bot desativado.")


# ==================== AUTH ====================


@app.post("/api/auth/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Usuário já existe")

    user = User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        telegram_id=user_data.telegram_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/api/auth/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ==================== CATEGORIES ====================


@app.get("/api/categories", response_model=List[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Category).order_by(Category.name).all()


@app.post("/api/categories", response_model=CategoryResponse, status_code=201)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Categoria já existe")

    category = Category(**data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


# ==================== TRANSACTIONS ====================


@app.get("/api/transactions", response_model=List[TransactionResponse])
def list_transactions(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if month:
        query = query.filter(extract("month", Transaction.created_at) == month)
    if year:
        query = query.filter(extract("year", Transaction.created_at) == year)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)

    return query.order_by(Transaction.created_at.desc()).limit(limit).all()


@app.post("/api/transactions", response_model=TransactionResponse, status_code=201)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = Transaction(
        amount=data.amount,
        type=data.type,
        description=data.description,
        category_id=data.category_id,
        user_id=current_user.id,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return db.query(Transaction).filter(Transaction.id == transaction.id).first()


@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    db.delete(transaction)
    db.commit()
    return {"detail": "Transação removida com sucesso"}


# ==================== REPORTS ====================


@app.get("/api/reports/summary", response_model=SummaryResponse)
def get_summary(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            extract("month", Transaction.created_at) == m,
            extract("year", Transaction.created_at) == y,
        )
        .all()
    )

    income = sum(t.amount for t in transactions if t.type == "income")
    expense = sum(t.amount for t in transactions if t.type == "expense")

    return SummaryResponse(
        total_income=income,
        total_expense=expense,
        balance=income - expense,
        transaction_count=len(transactions),
    )


@app.get("/api/reports/by-category", response_model=List[CategorySummary])
def get_by_category(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            extract("month", Transaction.created_at) == m,
            extract("year", Transaction.created_at) == y,
        )
        .all()
    )

    total_expense = sum(t.amount for t in transactions)
    category_totals: dict = {}

    for t in transactions:
        cat_id = t.category_id or 0
        if cat_id not in category_totals:
            cat = t.category
            category_totals[cat_id] = {
                "category_id": cat.id if cat else 0,
                "category_name": cat.name if cat else "Sem categoria",
                "category_icon": cat.icon if cat else "❓",
                "category_color": cat.color if cat else "#6B7280",
                "total": 0,
            }
        category_totals[cat_id]["total"] += t.amount

    result = []
    for data in category_totals.values():
        data["percentage"] = (
            (data["total"] / total_expense * 100) if total_expense > 0 else 0
        )
        result.append(CategorySummary(**data))

    return sorted(result, key=lambda x: x.total, reverse=True)


@app.get("/api/reports/monthly-evolution", response_model=List[MonthlyEvolution])
def get_monthly_evolution(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    y = year or datetime.utcnow().year

    result = []
    for month in range(1, 13):
        transactions = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == current_user.id,
                extract("month", Transaction.created_at) == month,
                extract("year", Transaction.created_at) == y,
            )
            .all()
        )

        income = sum(t.amount for t in transactions if t.type == "income")
        expense = sum(t.amount for t in transactions if t.type == "expense")

        result.append(
            MonthlyEvolution(month=month, year=y, income=income, expense=expense)
        )

    return result


# ==================== SALARY CONFIG ====================


@app.get("/api/salary/config")
def get_salary_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(SalaryConfig).filter(SalaryConfig.user_id == current_user.id).first()


@app.post("/api/salary/config", response_model=SalaryConfigResponse)
def set_salary_config(
    data: SalaryConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(SalaryConfig).filter(SalaryConfig.user_id == current_user.id).first()
    if existing:
        for key, value in data.model_dump().items():
            setattr(existing, key, value)
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    config = SalaryConfig(user_id=current_user.id, **data.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@app.get("/api/salary/calendar", response_model=List[SalaryMonthCalendar])
def get_salary_calendar(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    y = year or datetime.utcnow().year
    config = db.query(SalaryConfig).filter(SalaryConfig.user_id == current_user.id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Nenhuma configuração de salário encontrada")

    result = []
    for month in range(1, 13):
        part1 = get_salary_payment_info(y, month, config.part1_day)
        part1["amount"] = config.part1_amount

        part2 = None
        if config.has_two_parts and config.part2_day:
            part2 = get_salary_payment_info(y, month, config.part2_day)
            part2["amount"] = config.part2_amount

        result.append(SalaryMonthCalendar(
            month=month,
            year=y,
            month_name=MONTHS_PT[month],
            total_amount=config.total_amount,
            part1=part1,
            part2=part2,
        ))

    return result


# ==================== CATEGORY BUDGETS ====================


@app.get("/api/budgets", response_model=List[CategoryBudgetResponse])
def get_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(CategoryBudget).filter(CategoryBudget.user_id == current_user.id).all()


@app.post("/api/budgets", response_model=CategoryBudgetResponse, status_code=201)
def set_budget(
    data: CategoryBudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(CategoryBudget).filter(
        CategoryBudget.user_id == current_user.id,
        CategoryBudget.category_id == data.category_id,
    ).first()
    if existing:
        existing.budget_amount = data.budget_amount
        db.commit()
        db.refresh(existing)
        return existing

    budget = CategoryBudget(
        user_id=current_user.id,
        category_id=data.category_id,
        budget_amount=data.budget_amount,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@app.delete("/api/budgets/{category_id}")
def delete_budget(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.query(CategoryBudget).filter(
        CategoryBudget.user_id == current_user.id,
        CategoryBudget.category_id == category_id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    db.delete(budget)
    db.commit()
    return {"detail": "Orçamento removido"}


# ==================== MONTHLY DETAIL ====================


@app.get("/api/reports/monthly-detail", response_model=List[CategoryMonthlyDetail])
def get_monthly_detail(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            extract("month", Transaction.created_at) == m,
            extract("year", Transaction.created_at) == y,
        )
        .all()
    )

    categories = db.query(Category).order_by(Category.name).all()
    budgets_map = {
        b.category_id: b.budget_amount
        for b in db.query(CategoryBudget).filter(
            CategoryBudget.user_id == current_user.id
        ).all()
    }

    # Agrega totais por categoria
    totals: dict[int, float] = {}
    counts: dict[int, int] = {}
    for t in transactions:
        cid = t.category_id or 0
        totals[cid] = totals.get(cid, 0) + t.amount
        counts[cid] = counts.get(cid, 0) + 1

    result = []
    for cat in categories:
        total = totals.get(cat.id, 0.0)
        budget = budgets_map.get(cat.id)

        if budget and budget > 0:
            pct = (total / budget) * 100
            if pct >= 100:
                status = "over"
            elif pct >= 90:
                status = "danger"
            elif pct >= 70:
                status = "warning"
            else:
                status = "ok"
        else:
            pct = None
            status = "none"

        result.append(CategoryMonthlyDetail(
            category_id=cat.id,
            category_name=cat.name,
            category_icon=cat.icon,
            category_color=cat.color,
            total=total,
            budget=budget,
            percentage_used=pct,
            status=status,
            transaction_count=counts.get(cat.id, 0),
        ))

    # Ordena: com transações primeiro (maior gasto), depois sem
    result.sort(key=lambda x: (-x.total, x.category_name))
    return result


# ==================== GASTOS RECORRENTES ====================


@app.get("/api/recurring", response_model=List[RecurringExpenseResponse])
def list_recurring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(RecurringExpense)
        .filter(RecurringExpense.user_id == current_user.id)
        .order_by(RecurringExpense.due_day)
        .all()
    )


@app.post("/api/recurring", response_model=RecurringExpenseResponse, status_code=201)
def create_recurring(
    data: RecurringExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = RecurringExpense(user_id=current_user.id, **data.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return db.query(RecurringExpense).filter(RecurringExpense.id == expense.id).first()


@app.put("/api/recurring/{expense_id}", response_model=RecurringExpenseResponse)
def update_recurring(
    expense_id: int,
    data: RecurringExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.query(RecurringExpense).filter(
        RecurringExpense.id == expense_id,
        RecurringExpense.user_id == current_user.id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto recorrente não encontrado")
    for k, v in data.model_dump().items():
        setattr(expense, k, v)
    db.commit()
    db.refresh(expense)
    return db.query(RecurringExpense).filter(RecurringExpense.id == expense.id).first()


@app.delete("/api/recurring/{expense_id}")
def delete_recurring(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.query(RecurringExpense).filter(
        RecurringExpense.id == expense_id,
        RecurringExpense.user_id == current_user.id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto recorrente não encontrado")
    db.delete(expense)
    db.commit()
    return {"detail": "Removido"}


@app.get("/api/recurring/by-bank", response_model=List[BankGroupSummary])
def recurring_by_bank(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    PAYMENT_LABELS = {
        "pix": "PIX",
        "debit": "Débito",
        "credit": "Crédito",
        "bank_transfer": "Ted/Doc/Boleto",
    }
    expenses = (
        db.query(RecurringExpense)
        .filter(
            RecurringExpense.user_id == current_user.id,
            RecurringExpense.is_active == True,
        )
        .all()
    )

    groups: dict = {}
    for exp in expenses:
        if exp.bank_name:
            key = exp.bank_name
            gtype = "bank"
        else:
            key = PAYMENT_LABELS.get(exp.payment_type, exp.payment_type)
            gtype = "payment_type"

        if key not in groups:
            groups[key] = {"group_name": key, "group_type": gtype, "total_amount": 0, "expense_count": 0, "expenses": []}
        groups[key]["total_amount"] += exp.amount
        groups[key]["expense_count"] += 1
        groups[key]["expenses"].append(exp)

    result = sorted(groups.values(), key=lambda g: g["total_amount"], reverse=True)
    return result


# ==================== CARTÕES DE CRÉDITO ====================


@app.get("/api/cards", response_model=List[CreditCardAccountResponse])
def list_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(CreditCardAccount)
        .filter(CreditCardAccount.user_id == current_user.id)
        .all()
    )


@app.post("/api/cards", response_model=CreditCardAccountResponse, status_code=201)
def create_card(
    data: CreditCardAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = CreditCardAccount(user_id=current_user.id, **data.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@app.delete("/api/cards/{card_id}")
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = db.query(CreditCardAccount).filter(
        CreditCardAccount.id == card_id,
        CreditCardAccount.user_id == current_user.id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    db.delete(card)
    db.commit()
    return {"detail": "Cartão removido"}


@app.get("/api/cards/{card_id}/installments", response_model=List[CardInstallmentResponse])
def list_installments(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(CardInstallment)
        .filter(
            CardInstallment.card_id == card_id,
            CardInstallment.user_id == current_user.id,
        )
        .all()
    )
    result = []
    for r in rows:
        d = r.__dict__.copy()
        d["remaining_installments"] = r.total_installments - r.paid_installments
        result.append(d)
    return result


@app.post("/api/cards/{card_id}/installments", response_model=CardInstallmentResponse, status_code=201)
def create_installment(
    card_id: int,
    data: CardInstallmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inst = CardInstallment(
        user_id=current_user.id,
        card_id=card_id,
        description=data.description,
        total_amount=data.total_amount,
        monthly_amount=data.monthly_amount,
        total_installments=data.total_installments,
        paid_installments=data.paid_installments,
        start_date=data.start_date or datetime.utcnow(),
        category_id=data.category_id,
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    inst_dict = inst.__dict__.copy()
    inst_dict["remaining_installments"] = inst.total_installments - inst.paid_installments
    return inst_dict


@app.get("/api/cards/{card_id}/subscriptions", response_model=List[CardSubscriptionResponse])
def list_subscriptions(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(CardSubscription)
        .filter(
            CardSubscription.card_id == card_id,
            CardSubscription.user_id == current_user.id,
        )
        .all()
    )


@app.post("/api/cards/{card_id}/subscriptions", response_model=CardSubscriptionResponse, status_code=201)
def create_subscription(
    card_id: int,
    data: CardSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = CardSubscription(
        user_id=current_user.id,
        card_id=card_id,
        description=data.description,
        monthly_amount=data.monthly_amount,
        category_id=data.category_id,
        is_active=data.is_active,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@app.get("/api/cards/monthly-view")
def cards_monthly_view(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from calendar import monthrange
    y = year or datetime.utcnow().year
    cards = db.query(CreditCardAccount).filter(
        CreditCardAccount.user_id == current_user.id,
        CreditCardAccount.is_active == True,
    ).all()

    result = []
    for card in cards:
        months_data = []
        installments = db.query(CardInstallment).filter(
            CardInstallment.card_id == card.id
        ).all()
        subscriptions = db.query(CardSubscription).filter(
            CardSubscription.card_id == card.id,
            CardSubscription.is_active == True,
        ).all()
        sub_total = sum(s.monthly_amount for s in subscriptions)

        for m in range(1, 13):
            fatura = 0.0
            for inst in installments:
                # calc how many months from start_date to (y, m)
                start = inst.start_date
                months_diff = (y - start.year) * 12 + (m - start.month)
                if 0 <= months_diff < (inst.total_installments - inst.paid_installments):
                    fatura += inst.monthly_amount

            months_data.append(CardMonthData(
                month=m, year=y,
                fatura_atual=fatura,
                gastos_variaveis=0.0,
                assinaturas=sub_total,
                total=fatura + sub_total,
            ))

        result.append({
            "card": card,
            "months": months_data,
            "total_installments_monthly": sum(i.monthly_amount for i in installments),
            "total_subscriptions_monthly": sub_total,
        })
    return result


# ==================== EMPRÉSTIMOS ====================


@app.get("/api/loans", response_model=List[LoanResponse])
def list_loans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loans = db.query(Loan).filter(
        Loan.user_id == current_user.id,
        Loan.is_active == True,
    ).all()
    result = []
    for l in loans:
        d = l.__dict__.copy()
        d["remaining_installments"] = l.total_installments - l.paid_installments
        result.append(d)
    return result


@app.post("/api/loans", response_model=LoanResponse, status_code=201)
def create_loan(
    data: LoanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = Loan(
        user_id=current_user.id,
        bank_name=data.bank_name,
        name=data.name,
        total_amount=data.total_amount,
        installment_amount=data.installment_amount,
        total_installments=data.total_installments,
        paid_installments=data.paid_installments,
        due_day=data.due_day,
        start_date=data.start_date or datetime.utcnow(),
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    d = loan.__dict__.copy()
    d["remaining_installments"] = loan.total_installments - loan.paid_installments
    return d


@app.delete("/api/loans/{loan_id}")
def delete_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.query(Loan).filter(
        Loan.id == loan_id, Loan.user_id == current_user.id
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    loan.is_active = False
    db.commit()
    return {"detail": "Empréstimo arquivado"}


@app.get("/api/loans/schedule")
def loans_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    MONTHS_PT_LOCAL = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                       "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    loans = db.query(Loan).filter(
        Loan.user_id == current_user.id,
        Loan.is_active == True,
    ).all()

    result = []
    for loan in loans:
        schedule = []
        remaining = loan.total_installments - loan.paid_installments
        start_year = loan.start_date.year
        start_month = loan.start_date.month + loan.paid_installments
        while start_month > 12:
            start_year += 1
            start_month -= 12

        for i in range(remaining):
            m = start_month + i
            y = start_year
            while m > 12:
                m -= 12
                y += 1
            schedule.append(LoanMonthItem(
                month=m, year=y,
                month_name=MONTHS_PT_LOCAL[m],
                installment_number=loan.paid_installments + i + 1,
                amount=loan.installment_amount,
                is_paid=False,
            ))

        loan_dict = loan.__dict__.copy()
        loan_dict["remaining_installments"] = remaining
        result.append({"loan": loan_dict, "schedule": schedule})
    return result


# ==================== ORÇAMENTO SEMANAL ====================


@app.get("/api/weekly-budget", response_model=WeeklyBudgetResponse)
def get_weekly_budget(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wb = db.query(WeeklyBudget).filter(WeeklyBudget.user_id == current_user.id).first()
    if not wb:
        raise HTTPException(status_code=404, detail="Orçamento semanal não configurado")
    return wb


@app.post("/api/weekly-budget", response_model=WeeklyBudgetResponse)
def set_weekly_budget(
    data: WeeklyBudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(WeeklyBudget).filter(WeeklyBudget.user_id == current_user.id).first()
    if existing:
        existing.amount = data.amount
        db.commit()
        db.refresh(existing)
        return existing
    wb = WeeklyBudget(user_id=current_user.id, amount=data.amount)
    db.add(wb)
    db.commit()
    db.refresh(wb)
    return wb


# ==================== FLUXO DIÁRIO ====================


@app.get("/api/daily-flow", response_model=List[DailyFlowItem])
def get_daily_flow(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from calendar import monthrange
    WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    today = now.date()
    _, days_in_month = monthrange(y, m)

    # Salary config
    salary_cfg = db.query(SalaryConfig).filter(SalaryConfig.user_id == current_user.id).first()

    # Recurring expenses
    recurring = db.query(RecurringExpense).filter(
        RecurringExpense.user_id == current_user.id,
        RecurringExpense.is_active == True,
    ).all()

    # Actual transactions this month
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            extract("month", Transaction.created_at) == m,
            extract("year", Transaction.created_at) == y,
        )
        .all()
    )

    from collections import defaultdict
    trans_by_day: dict = defaultdict(list)
    for t in transactions:
        trans_by_day[t.created_at.day].append(t)

    running_balance = 0.0
    result = []

    for day in range(1, days_in_month + 1):
        from datetime import date
        d = date(y, m, day)
        is_today = (d == today)
        is_future = (d > today)
        events = []
        income = 0.0
        recurring_total = 0.0
        variable_total = 0.0

        # Salary income
        if salary_cfg:
            if salary_cfg.part1_day == day:
                info = get_salary_payment_info(y, m, salary_cfg.part1_day)
                if info["payment_day"] == day:
                    income += salary_cfg.part1_amount
                    events.append(f"Salário Parte 1: R${salary_cfg.part1_amount:,.0f}")
            if salary_cfg.has_two_parts and salary_cfg.part2_day == day:
                info2 = get_salary_payment_info(y, m, salary_cfg.part2_day)
                if info2["payment_day"] == day:
                    income += salary_cfg.part2_amount
                    events.append(f"Salário Parte 2: R${salary_cfg.part2_amount:,.0f}")

        # Recurring expenses due today
        for rec in recurring:
            if rec.due_day == day:
                recurring_total += rec.amount
                events.append(f"{rec.name}: R${rec.amount:,.0f}")

        # Actual transactions
        for t in trans_by_day.get(day, []):
            if t.type == "expense":
                variable_total += t.amount
            else:
                income += t.amount

        total_expense = recurring_total + variable_total
        net = income - total_expense
        running_balance += net

        result.append(DailyFlowItem(
            date=d.strftime("%Y-%m-%d"),
            day_of_week=WEEKDAYS_PT[d.weekday()],
            income=income,
            recurring_expenses=recurring_total,
            variable_expenses=variable_total,
            total_expense=total_expense,
            net=net,
            running_balance=running_balance,
            is_today=is_today,
            is_future=is_future,
            events=events,
        ))

    return result


# ==================== CENÁRIOS DE GASTO ====================


def _build_scenario_response(s: Scenario) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "icon": s.icon,
        "color": s.color,
        "month": s.month,
        "year": s.year,
        "notes": s.notes,
        "total_estimated": sum(i.estimated_amount for i in s.items),
        "items": [{"id": i.id, "category_name": i.category_name, "icon": i.icon, "estimated_amount": i.estimated_amount} for i in s.items],
        "created_at": s.created_at,
    }


@app.get("/api/scenarios", response_model=List[ScenarioResponse])
def list_scenarios(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    scenarios = (
        db.query(Scenario)
        .filter(Scenario.user_id == current_user.id, Scenario.month == m, Scenario.year == y)
        .order_by(Scenario.created_at)
        .all()
    )
    return [_build_scenario_response(s) for s in scenarios]


@app.post("/api/scenarios", response_model=ScenarioResponse, status_code=201)
def create_scenario(
    data: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scenario = Scenario(
        user_id=current_user.id,
        name=data.name,
        icon=data.icon,
        color=data.color,
        month=data.month,
        year=data.year,
        notes=data.notes,
    )
    db.add(scenario)
    db.flush()
    for item in data.items:
        db.add(ScenarioItem(scenario_id=scenario.id, **item.model_dump()))
    db.commit()
    db.refresh(scenario)
    return _build_scenario_response(scenario)


@app.put("/api/scenarios/{scenario_id}", response_model=ScenarioResponse)
def update_scenario(
    scenario_id: int,
    data: ScenarioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id, Scenario.user_id == current_user.id
    ).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")

    scenario.name = data.name
    scenario.icon = data.icon
    scenario.color = data.color
    scenario.notes = data.notes

    # Replace items
    for old in scenario.items:
        db.delete(old)
    db.flush()
    for item in data.items:
        db.add(ScenarioItem(scenario_id=scenario.id, **item.model_dump()))

    db.commit()
    db.refresh(scenario)
    return _build_scenario_response(scenario)


@app.delete("/api/scenarios/{scenario_id}")
def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id, Scenario.user_id == current_user.id
    ).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    db.delete(scenario)
    db.commit()
    return {"detail": "Cenário removido"}


@app.post("/api/scenarios/{scenario_id}/duplicate", response_model=ScenarioResponse, status_code=201)
def duplicate_scenario(
    scenario_id: int,
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original = db.query(Scenario).filter(
        Scenario.id == scenario_id, Scenario.user_id == current_user.id
    ).first()
    if not original:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")

    now = datetime.utcnow()
    copy = Scenario(
        user_id=current_user.id,
        name=f"{original.name} (cópia)",
        icon=original.icon,
        color=original.color,
        month=month or original.month,
        year=year or original.year,
        notes=original.notes,
    )
    db.add(copy)
    db.flush()
    for item in original.items:
        db.add(ScenarioItem(
            scenario_id=copy.id,
            category_name=item.category_name,
            icon=item.icon,
            estimated_amount=item.estimated_amount,
        ))
    db.commit()
    db.refresh(copy)
    return _build_scenario_response(copy)


@app.get("/api/scenarios/impact", response_model=ScenarioMonthlyImpact)
def scenarios_impact(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    scenarios = (
        db.query(Scenario)
        .filter(Scenario.user_id == current_user.id, Scenario.month == m, Scenario.year == y)
        .all()
    )
    total = sum(sum(i.estimated_amount for i in s.items) for s in scenarios)
    return ScenarioMonthlyImpact(
        month=m, year=y,
        scenario_count=len(scenarios),
        total_planned=total,
        scenarios=[_build_scenario_response(s) for s in scenarios],
    )


# ==================== RUN ====================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)