from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    telegram_id = Column(Integer, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="user")
    salary_config = relationship("SalaryConfig", back_populates="user", uselist=False)
    budgets = relationship("CategoryBudget", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    icon = Column(String, default="📦")
    color = Column(String, default="#6B7280")

    transactions = relationship("Transaction", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)  # "income" ou "expense"
    description = Column(String, default="")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")


class SalaryConfig(Base):
    __tablename__ = "salary_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    total_amount = Column(Float, nullable=False)
    has_two_parts = Column(Boolean, default=False)
    part1_amount = Column(Float, nullable=False)
    part1_day = Column(Integer, nullable=False)  # 1-31
    part2_amount = Column(Float, nullable=True)
    part2_day = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="salary_config")


class CategoryBudget(Base):
    __tablename__ = "category_budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    budget_amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="budgets")
    category = relationship("Category")


# ==================== GASTOS RECORRENTES ====================


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    amount = Column(Float, nullable=False)
    due_day = Column(Integer, nullable=False)       # 1–31
    bank_name = Column(String, nullable=True)        # nome livre do banco
    payment_type = Column(String, nullable=False, default="pix")
    # pix | debit | credit | bank_transfer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    category = relationship("Category")


# ==================== CARTÕES DE CRÉDITO ====================


class CreditCardAccount(Base):
    __tablename__ = "credit_card_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bank_name = Column(String, nullable=False)
    card_name = Column(String, nullable=False)
    closing_day = Column(Integer, nullable=False)
    due_day = Column(Integer, nullable=False)
    color = Column(String, default="#6366F1")
    icon = Column(String, default="💳")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    installments = relationship("CardInstallment", back_populates="card")
    subscriptions = relationship("CardSubscription", back_populates="card")


class CardInstallment(Base):
    """Compra parcelada — cada registro é uma compra parcelada no cartão."""
    __tablename__ = "card_installments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("credit_card_accounts.id"), nullable=False)
    description = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    monthly_amount = Column(Float, nullable=False)
    total_installments = Column(Integer, nullable=False)
    paid_installments = Column(Integer, default=0)
    start_date = Column(DateTime, default=datetime.utcnow)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    user = relationship("User")
    card = relationship("CreditCardAccount", back_populates="installments")
    category = relationship("Category")


class CardSubscription(Base):
    """Assinatura recorrente no cartão."""
    __tablename__ = "card_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("credit_card_accounts.id"), nullable=False)
    description = Column(String, nullable=False)
    monthly_amount = Column(Float, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    card = relationship("CreditCardAccount", back_populates="subscriptions")
    category = relationship("Category")


# ==================== EMPRÉSTIMOS ====================


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bank_name = Column(String, nullable=True)
    name = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    installment_amount = Column(Float, nullable=False)
    total_installments = Column(Integer, nullable=False)
    paid_installments = Column(Integer, default=0)
    due_day = Column(Integer, nullable=False)
    start_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    user = relationship("User")


# ==================== OR ÇAMENTO SEMANAL ====================


class WeeklyBudget(Base):
    __tablename__ = "weekly_budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    amount = Column(Float, nullable=False)

    user = relationship("User")


# ==================== CENÁRIOS DE GASTO ====================


class Scenario(Base):
    """Cenário de gasto planejado (ex: Passeio, Ensaio de Banda)."""
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    icon = Column(String, default="🎯")
    color = Column(String, default="#6366F1")
    month = Column(Integer, nullable=False)   # 1-12
    year = Column(Integer, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    items = relationship("ScenarioItem", back_populates="scenario", cascade="all, delete-orphan")


class ScenarioItem(Base):
    """Categoria com valor estimado dentro de um cenário."""
    __tablename__ = "scenario_items"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)
    category_name = Column(String, nullable=False)
    icon = Column(String, default="📦")
    estimated_amount = Column(Float, nullable=False)

    scenario = relationship("Scenario", back_populates="items")
