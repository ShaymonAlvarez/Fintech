/** Feriados nacionais fixos brasileiros: [mês, dia, nome] */
const FIXED_HOLIDAYS: [number, number, string][] = [
  [1,  1,  "Ano Novo"],
  [4,  21, "Tiradentes"],
  [5,  1,  "Dia do Trabalho"],
  [9,  7,  "Independência"],
  [10, 12, "N. Sra. Aparecida"],
  [11, 2,  "Finados"],
  [11, 15, "Proclamação da República"],
  [12, 25, "Natal"],
];

export const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MONTHS_PT = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function isBusinessDay(d: Date): boolean {
  const wd = d.getDay(); // 0=Dom, 6=Sáb
  if (wd === 0 || wd === 6) return false;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return !FIXED_HOLIDAYS.some(([hm, hd]) => hm === m && hd === day);
}

export function getSkipReason(d: Date): string | null {
  const wd = d.getDay();
  if (wd === 6) return "Sábado";
  if (wd === 0) return "Domingo";
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const holiday = FIXED_HOLIDAYS.find(([hm, hd]) => hm === m && hd === day);
  return holiday ? `Feriado: ${holiday[2]}` : null;
}

export function getNextBusinessDay(d: Date): Date {
  const result = new Date(d);
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

export interface PaymentInfo {
  targetDay: number;
  originalDate: Date;
  paymentDate: Date;
  isAdjusted: boolean;
  skipReason: string | null;
  weekday: string;
}

export function getSalaryPaymentInfo(
  year: number,
  month: number,
  targetDay: number
): PaymentInfo {
  // Último dia do mês
  const maxDay = new Date(year, month, 0).getDate();
  const actualDay = Math.min(targetDay, maxDay);
  const original = new Date(year, month - 1, actualDay);
  const payment = getNextBusinessDay(original);
  const isAdjusted = original.getTime() !== payment.getTime();

  return {
    targetDay,
    originalDate: original,
    paymentDate: payment,
    isAdjusted,
    skipReason: isAdjusted ? getSkipReason(original) : null,
    weekday: WEEKDAYS_PT[payment.getDay()],
  };
}
