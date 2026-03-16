"""
🤖 Bot do Telegram para registro de finanças.

Uso:
  +150 salário           → Registra receita de R$150
  -45.90 mercado         → Registra despesa de R$45.90
  -25 uber transporte    → Registra despesa com categoria "transporte"
  /resumo                → Resumo do mês atual
  /saldo                 → Saldo total
  /categorias            → Lista categorias
  /ultimas               → Últimas 10 transações
"""

import re
from datetime import datetime, timedelta
from typing import Optional

from telegram import Update, BotCommand
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)
from sqlalchemy import extract

from database import SessionLocal
from models import (
    User,
    Category,
    Transaction,
    RecurringExpense,
    CreditCardAccount,
    CardInstallment,
    CardSubscription,
)
from config import TELEGRAM_BOT_TOKEN, ALLOWED_TELEGRAM_IDS

# ==================== MAPEAMENTO DE CATEGORIAS ====================

CATEGORY_KEYWORDS = {
    "Alimentação": [
        "alimentação", "comida", "mercado", "restaurante", "lanche",
        "almoço", "jantar", "café", "padaria", "pizza", "ifood",
        "delivery", "açougue", "feira", "supermercado", "rappi",
    ],
    "Transporte": [
        "transporte", "uber", "99", "ônibus", "gasolina", "combustível",
        "estacionamento", "pedágio", "metrô", "táxi", "moto",
    ],
    "Moradia": [
        "moradia", "aluguel", "luz", "água", "internet", "condomínio",
        "gás", "iptu", "casa", "energia", "telefone", "celular",
    ],
    "Saúde": [
        "saúde", "farmácia", "médico", "remédio", "hospital",
        "dentista", "plano", "academia", "consulta", "exame",
    ],
    "Educação": [
        "educação", "curso", "livro", "escola", "faculdade",
        "material", "mensalidade", "aula", "treinamento",
    ],
    "Lazer": [
        "lazer", "cinema", "jogo", "viagem", "festa", "bar",
        "show", "netflix", "spotify", "streaming", "assinatura",
    ],
    "Vestuário": [
        "vestuário", "roupa", "calçado", "acessório", "tênis",
        "camisa", "calça", "sapato", "loja",
    ],
    "Renda": [
        "salário", "freelance", "renda", "pagamento", "bônus",
        "extra", "pix", "transferência", "depósito",
    ],
    "Investimento": [
        "investimento", "dividendo", "rendimento", "juros",
        "poupança", "ações", "fundo", "cripto", "bitcoin",
    ],
}

MONTHS_PT = [
    "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

telegram_app: Optional[Application] = None


# ==================== HELPERS ====================


def is_authorized(user_id: int) -> bool:
    """Verifica se o usuário está autorizado."""
    if not ALLOWED_TELEGRAM_IDS:
        return True
    return user_id in ALLOWED_TELEGRAM_IDS


def find_category(text: str, db, explicit_category: str | None = None) -> Category:
    """Encontra a categoria mais relevante baseada no texto."""
    if explicit_category:
        cat = db.query(Category).filter(Category.name.ilike(explicit_category)).first()
        if cat:
            return cat

    text_lower = text.lower()
    for cat_name, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                cat = db.query(Category).filter(
                    Category.name == cat_name
                ).first()
                if cat:
                    return cat

    cat = db.query(Category).filter(Category.name == "Outros").first()
    if cat:
        return cat

    return db.query(Category).order_by(Category.id.asc()).first()


def _parse_target_date(raw_value: str) -> datetime | None:
    now = datetime.utcnow()
    value = raw_value.strip().lower()

    if value == "hoje":
        return now.replace(hour=12, minute=0, second=0, microsecond=0)
    if value == "amanha":
        target = now + timedelta(days=1)
        return target.replace(hour=12, minute=0, second=0, microsecond=0)

    try:
        if re.fullmatch(r"\d{1,2}", value):
            return now.replace(day=int(value), hour=12, minute=0, second=0, microsecond=0)
        if re.fullmatch(r"\d{1,2}/\d{1,2}", value):
            day, month = map(int, value.split("/"))
            return datetime(now.year, month, day, 12, 0, 0)
        if re.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}", value):
            day, month, year = map(int, value.split("/"))
            return datetime(year, month, day, 12, 0, 0)
    except ValueError:
        return None

    return None


def parse_message(text: str) -> dict | None:
    """
    Parseia mensagens de transação.
    Exemplos:
      +150 salário
      -45.90 mercado alimentação
      +1000,50 freelance
      -25 uber
    """
    pattern = r"^([+-])\s*(\d+(?:[.,]\d{1,2})?)\s*(.*)?$"
    match = re.match(pattern, text.strip())

    if not match:
        return None

    sign = match.group(1)
    amount = float(match.group(2).replace(",", "."))
    description = (match.group(3) or "").strip()

    explicit_category = None
    date_match = re.search(r"@([^#]+)$", description)
    if date_match:
        date_value = date_match.group(1).strip()
        created_at = _parse_target_date(date_value)
        description = description[:date_match.start()].strip()
    else:
        created_at = None

    category_match = re.search(r"#([^@]+)", description)
    if category_match:
        explicit_category = category_match.group(1).strip()
        description = (description[:category_match.start()] + description[category_match.end():]).strip()

    return {
        "type": "income" if sign == "+" else "expense",
        "amount": amount,
        "description": description,
        "explicit_category": explicit_category,
        "created_at": created_at,
    }


def get_user_by_telegram(telegram_id: int, db) -> User | None:
    """Busca usuário pelo Telegram ID."""
    return db.query(User).filter(User.telegram_id == telegram_id).first()


def _get_linked_user_or_reply(update: Update, db) -> User | None:
    user = get_user_by_telegram(update.effective_user.id, db)
    return user


def _split_command_payload(raw_args: list[str]) -> list[str]:
    joined = " ".join(raw_args).strip()
    return [part.strip() for part in joined.split("|") if part.strip()]


def _find_card_by_name(db, user_id: int, name: str) -> CreditCardAccount | None:
    normalized = name.strip().lower()
    cards = db.query(CreditCardAccount).filter(CreditCardAccount.user_id == user_id).all()
    for card in cards:
        haystack = f"{card.bank_name} {card.card_name}".lower()
        if normalized in haystack:
            return card
    return None


# ==================== HANDLERS ====================


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_user.id):
        await update.message.reply_text("⛔ Acesso não autorizado.")
        return

    await update.message.reply_text(
        "💰 *Finanças Bot*\n\n"
        "Registre suas finanças enviando mensagens simples:\n\n"
        "📥 *Receita:* `+150 salário`\n"
        "📤 *Despesa:* `-45.90 mercado`\n"
        "📤 *Com categoria:* `-25 uber transporte`\n\n"
        "📅 *Com data:* `-45 mercado @20/03`\n"
        "🏷️ *Categoria explícita:* `-35 almoço #Restaurante`\n\n"
        "🔁 *Recorrente:* `/recorrente academia | 99 | Saúde | 5 | debit`\n"
        "💳 *Parcelado:* `/parcelado celular | 1200 | 10 | nubank | E-Commerce | 20/03/2026`\n"
        "📆 *Assinatura:* `/assinatura spotify | 21.90 | itau | Lazer`\n\n"
        "📋 *Comandos disponíveis:*\n"
        "/resumo — Resumo do mês\n"
        "/saldo — Saldo total\n"
        "/categorias — Ver categorias\n"
        "/ultimas — Últimas transações\n"
        "/recorrente — Criar gasto recorrente\n"
        "/parcelado — Criar compra parcelada\n"
        "/assinatura — Criar assinatura no cartão\n"
        "/ajuda — Esta mensagem\n\n"
        f"🆔 Seu Telegram ID: `{update.effective_user.id}`",
        parse_mode="Markdown",
    )


async def cmd_ajuda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await cmd_start(update, context)


async def cmd_recorrente(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_user.id):
        return

    parts = _split_command_payload(context.args)
    if len(parts) < 4:
        await update.message.reply_text(
            "Use: /recorrente descrição | valor | categoria | dia | forma(opcional) | banco(opcional)"
        )
        return

    db = SessionLocal()
    try:
        user = _get_linked_user_or_reply(update, db)
        if not user:
            await update.message.reply_text("⚠️ Telegram não vinculado.")
            return

        description, amount_raw, category_raw, due_day_raw = parts[:4]
        payment_type = parts[4] if len(parts) > 4 else "pix"
        bank_name = parts[5] if len(parts) > 5 else None
        category = find_category(description, db, category_raw)

        expense = RecurringExpense(
            user_id=user.id,
            name=description,
            category_id=category.id if category else None,
            amount=float(amount_raw.replace(",", ".")),
            due_day=int(due_day_raw),
            bank_name=bank_name,
            payment_type=payment_type,
            is_active=True,
        )
        db.add(expense)
        db.commit()

        await update.message.reply_text(
            f"🔁 Recorrente criado: {description} · R$ {expense.amount:.2f} · dia {expense.due_day}"
        )
    finally:
        db.close()


async def cmd_parcelado(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_user.id):
        return

    parts = _split_command_payload(context.args)
    if len(parts) < 5:
        await update.message.reply_text(
            "Use: /parcelado descrição | total | parcelas | cartão | categoria | data(opcional dd/mm/aaaa)"
        )
        return

    db = SessionLocal()
    try:
        user = _get_linked_user_or_reply(update, db)
        if not user:
            await update.message.reply_text("⚠️ Telegram não vinculado.")
            return

        description, total_raw, installments_raw, card_raw, category_raw = parts[:5]
        start_date = _parse_target_date(parts[5]) if len(parts) > 5 else datetime.utcnow()
        card = _find_card_by_name(db, user.id, card_raw)
        if not card:
          await update.message.reply_text("⚠️ Cartão não encontrado.")
          return

        total_amount = float(total_raw.replace(",", "."))
        total_installments = int(installments_raw)
        category = find_category(description, db, category_raw)

        installment = CardInstallment(
            user_id=user.id,
            card_id=card.id,
            description=description,
            total_amount=total_amount,
            monthly_amount=round(total_amount / total_installments, 2),
            total_installments=total_installments,
            paid_installments=0,
            start_date=start_date or datetime.utcnow(),
            category_id=category.id if category else None,
        )
        db.add(installment)
        db.commit()

        await update.message.reply_text(
            f"💳 Parcelado criado: {description} · {total_installments}x de R$ {installment.monthly_amount:.2f}"
        )
    finally:
        db.close()


async def cmd_assinatura(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_user.id):
        return

    parts = _split_command_payload(context.args)
    if len(parts) < 4:
        await update.message.reply_text(
            "Use: /assinatura descrição | valor mensal | cartão | categoria"
        )
        return

    db = SessionLocal()
    try:
        user = _get_linked_user_or_reply(update, db)
        if not user:
            await update.message.reply_text("⚠️ Telegram não vinculado.")
            return

        description, amount_raw, card_raw, category_raw = parts[:4]
        card = _find_card_by_name(db, user.id, card_raw)
        if not card:
            await update.message.reply_text("⚠️ Cartão não encontrado.")
            return
        category = find_category(description, db, category_raw)

        subscription = CardSubscription(
            user_id=user.id,
            card_id=card.id,
            description=description,
            monthly_amount=float(amount_raw.replace(",", ".")),
            category_id=category.id if category else None,
            is_active=True,
        )
        db.add(subscription)
        db.commit()

        await update.message.reply_text(
            f"📆 Assinatura criada: {description} · R$ {subscription.monthly_amount:.2f}/mês"
        )
    finally:
        db.close()


async def handle_transaction(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa mensagens de transação (+/-)."""
    if not is_authorized(update.effective_user.id):
        return

    text = update.message.text
    parsed = parse_message(text)

    if not parsed:
        return  # Ignora mensagens que não são transações

    db = SessionLocal()
    try:
        user = get_user_by_telegram(update.effective_user.id, db)
        if not user:
            await update.message.reply_text(
                "⚠️ *Telegram não vinculado!*\n\n"
                "1. Acesse o dashboard web\n"
                "2. Crie uma conta\n"
                "3. Informe seu Telegram ID no cadastro\n\n"
                f"🆔 Seu ID: `{update.effective_user.id}`",
                parse_mode="Markdown",
            )
            return

        category = find_category(parsed["description"], db, parsed.get("explicit_category"))

        transaction = Transaction(
            amount=parsed["amount"],
            type=parsed["type"],
            description=parsed["description"],
            category_id=category.id if category else None,
            user_id=user.id,
            created_at=parsed.get("created_at") or datetime.utcnow(),
        )
        db.add(transaction)
        db.commit()

        emoji = "📥" if parsed["type"] == "income" else "📤"
        type_label = "Receita" if parsed["type"] == "income" else "Despesa"
        cat_icon = category.icon if category else "📦"
        cat_name = category.name if category else "Outros"

        await update.message.reply_text(
            f"{emoji} *{type_label} registrada!*\n\n"
            f"💵 Valor: R$ {parsed['amount']:.2f}\n"
            f"📝 Descrição: {parsed['description'] or 'N/A'}\n"
            f"{cat_icon} Categoria: {cat_name}\n"
            f"📅 Data: {(parsed.get('created_at') or transaction.created_at).strftime('%d/%m/%Y')}",
            parse_mode="Markdown",
        )
    finally:
        db.close()


async def cmd_resumo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mostra resumo do mês atual."""
    if not is_authorized(update.effective_user.id):
        return

    db = SessionLocal()
    try:
        user = get_user_by_telegram(update.effective_user.id, db)
        if not user:
            await update.message.reply_text("⚠️ Telegram não vinculado.")
            return

        now = datetime.utcnow()
        transactions = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == user.id,
                extract("month", Transaction.created_at) == now.month,
                extract("year", Transaction.created_at) == now.year,
            )
            .all()
        )

        income = sum(t.amount for t in transactions if t.type == "income")
        expense = sum(t.amount for t in transactions if t.type == "expense")
        balance = income - expense

        # Gastos por categoria
        cat_totals: dict = {}
        for t in transactions:
            if t.type == "expense" and t.category:
                name = f"{t.category.icon} {t.category.name}"
                cat_totals[name] = cat_totals.get(name, 0) + t.amount

        cat_text = ""
        if cat_totals:
            cat_text = "\n\n📂 *Por categoria:*\n"
            for name, total in sorted(
                cat_totals.items(), key=lambda x: x[1], reverse=True
            ):
                cat_text += f"  {name}: R$ {total:.2f}\n"

        balance_emoji = "✅" if balance >= 0 else "🔴"

        await update.message.reply_text(
            f"📊 *Resumo — {MONTHS_PT[now.month]}/{now.year}*\n\n"
            f"📥 Receitas: R$ {income:.2f}\n"
            f"📤 Despesas: R$ {expense:.2f}\n"
            f"{balance_emoji} Saldo: R$ {balance:.2f}\n"
            f"📋 Transações: {len(transactions)}"
            f"{cat_text}",
            parse_mode="Markdown",
        )
    finally:
        db.close()


async def cmd_saldo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mostra saldo total (todas as transações)."""
    if not is_authorized(update.effective_user.id):
        return

    db = SessionLocal()
    try:
        user = get_user_by_telegram(update.effective_user.id, db)
        if not user:
            await update.message.reply_text("⚠️ Telegram não vinculado.")
            return

        transactions = (
            db.query(Transaction).filter(Transaction.user_id == user.id).all()
        )

        income = sum(t.amount for t in transactions if t.type == "income")
        expense = sum(t.amount for t in transactions if t.type == "expense")
        balance = income - expense
        emoji = "✅" if balance >= 0 else "🔴"

        await update.message.reply_text(
            f"💰 *Saldo Total*\n\n"
            f"{emoji} *R$ {balance:.2f}*\n\n"
            f"📥 Total receitas: R$ {income:.2f}\n"
            f"📤 Total despesas: R$ {expense:.2f}",
            parse_mode="Markdown",
        )
    finally:
        db.close()


async def cmd_categorias(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lista todas as categorias disponíveis."""
    if not is_authorized(update.effective_user.id):
        return

    db = SessionLocal()
    try:
        cats = db.query(Category).order_by(Category.name).all()
        text = "📂 *Categorias disponíveis:*\n\n"
        for cat in cats:
            text += f"  {cat.icon} {cat.name}\n"

        text += (
            "\n💡 _Use palavras-chave na descrição para "
            "categorizar automaticamente!_"
        )
        await update.message.reply_text(text, parse_mode="Markdown")
    finally:
        db.close()


async def cmd_ultimas(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mostra as últimas 10 transações."""
    if not is_authorized(update.effective_user.id):
        return

    db = SessionLocal()
    try:
        user = get_user_by_telegram(update.effective_user.id, db)
        if not user:
            await update.message.reply_text("⚠️ Telegram não vinculado.")
            return

        transactions = (
            db.query(Transaction)
            .filter(Transaction.user_id == user.id)
            .order_by(Transaction.created_at.desc())
            .limit(10)
            .all()
        )

        if not transactions:
            await update.message.reply_text("📋 Nenhuma transação encontrada.")
            return

        text = "📋 *Últimas 10 transações:*\n\n"
        for t in transactions:
            emoji = "📥" if t.type == "income" else "📤"
            sign = "+" if t.type == "income" else "-"
            cat_icon = t.category.icon if t.category else "📦"
            date_str = t.created_at.strftime("%d/%m")
            desc = t.description or "—"
            text += (
                f"{emoji} {sign}R${t.amount:.2f}  "
                f"{desc}  {cat_icon}  _{date_str}_\n"
            )

        await update.message.reply_text(text, parse_mode="Markdown")
    finally:
        db.close()


# ==================== MAIN ====================


async def post_init(application):
    """Configura comandos do bot no menu do Telegram."""
    await application.bot.set_my_commands([
        BotCommand("start", "Iniciar o bot"),
        BotCommand("resumo", "Resumo do mês"),
        BotCommand("saldo", "Saldo total"),
        BotCommand("categorias", "Ver categorias"),
        BotCommand("ultimas", "Últimas transações"),
        BotCommand("recorrente", "Criar gasto recorrente"),
        BotCommand("parcelado", "Criar compra parcelada"),
        BotCommand("assinatura", "Criar assinatura no cartão"),
        BotCommand("ajuda", "Ajuda"),
    ])


def build_application() -> Application:
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).build()

    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("ajuda", cmd_ajuda))
    application.add_handler(CommandHandler("resumo", cmd_resumo))
    application.add_handler(CommandHandler("saldo", cmd_saldo))
    application.add_handler(CommandHandler("categorias", cmd_categorias))
    application.add_handler(CommandHandler("ultimas", cmd_ultimas))
    application.add_handler(CommandHandler("recorrente", cmd_recorrente))
    application.add_handler(CommandHandler("parcelado", cmd_parcelado))
    application.add_handler(CommandHandler("assinatura", cmd_assinatura))
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_transaction)
    )
    return application


async def get_or_create_application() -> Application:
    global telegram_app

    if telegram_app is None:
        telegram_app = build_application()
        await telegram_app.initialize()
        await telegram_app.start()
        await post_init(telegram_app)

    return telegram_app


async def setup_webhook(webhook_url: str, secret_token: str | None = None):
    application = await get_or_create_application()
    await application.bot.delete_webhook(drop_pending_updates=True)
    await application.bot.set_webhook(
        url=webhook_url,
        allowed_updates=Update.ALL_TYPES,
        secret_token=secret_token,
    )


async def process_webhook_update(data: dict):
    application = await get_or_create_application()
    update = Update.de_json(data, application.bot)
    await application.process_update(update)


async def shutdown_application():
    global telegram_app

    if telegram_app is not None:
        await telegram_app.stop()
        await telegram_app.shutdown()
        telegram_app = None


def main():
    if not TELEGRAM_BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN não configurado!")
        print("   Copie .env.example para .env e preencha o token.")
        return

    # Cria tabelas se não existirem
    from database import Base, engine
    Base.metadata.create_all(bind=engine)

    app = build_application()

    print("🤖 Bot do Telegram iniciado!")
    print("   Envie /start no Telegram para começar.")
    print("   Pressione Ctrl+C para parar.\n")

    app.run_polling(allowed_updates=Update.ALL_TYPES, stop_signals=None)


if __name__ == "__main__":
    main()
