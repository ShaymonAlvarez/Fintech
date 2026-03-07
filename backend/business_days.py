"""
Utilitários para cálculo de dias úteis brasileiros.
Considera fins de semana e feriados nacionais fixos.
"""
import calendar
from datetime import date, timedelta
from typing import Optional

MONTHS_PT = [
    "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

WEEKDAYS_PT = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

# Feriados nacionais fixos (mês, dia): nome
FIXED_HOLIDAYS: dict[tuple[int, int], str] = {
    (1, 1):   "Ano Novo",
    (4, 21):  "Tiradentes",
    (5, 1):   "Dia do Trabalho",
    (9, 7):   "Independência do Brasil",
    (10, 12): "N. Sra. Aparecida",
    (11, 2):  "Finados",
    (11, 15): "Proclamação da República",
    (12, 25): "Natal",
}


def is_business_day(d: date) -> bool:
    """Retorna True se a data for um dia útil (seg–sex, não feriado nacional)."""
    if d.weekday() >= 5:  # 5=Sábado, 6=Domingo
        return False
    if (d.month, d.day) in FIXED_HOLIDAYS:
        return False
    return True


def get_next_business_day(d: date) -> date:
    """Retorna o próximo dia útil (o mesmo dia se já for útil)."""
    while not is_business_day(d):
        d += timedelta(days=1)
    return d


def get_skip_reason(d: date) -> Optional[str]:
    """Retorna o motivo pelo qual a data não é útil, ou None se for útil."""
    wd = d.weekday()
    if wd == 5:
        return "Sábado"
    if wd == 6:
        return "Domingo"
    return FIXED_HOLIDAYS.get((d.month, d.day))


def get_salary_payment_info(year: int, month: int, target_day: int) -> dict:
    """
    Calcula a data real de pagamento do salário para o mês/ano dado.
    Se o dia alvo cair em fim de semana ou feriado, avança para o próximo dia útil.

    Returns:
        dict com target_day, original_date, payment_date, payment_day,
        is_adjusted, skip_reason, weekday
    """
    max_day = calendar.monthrange(year, month)[1]
    actual_day = min(target_day, max_day)
    original_date = date(year, month, actual_day)
    adjusted_date = get_next_business_day(original_date)
    is_adjusted = original_date != adjusted_date
    reason = get_skip_reason(original_date) if is_adjusted else None

    return {
        "target_day": target_day,
        "original_date": original_date.isoformat(),
        "payment_date": adjusted_date.isoformat(),
        "payment_day": adjusted_date.day,
        "is_adjusted": is_adjusted,
        "skip_reason": reason,
        "weekday": WEEKDAYS_PT[adjusted_date.weekday()],
    }
