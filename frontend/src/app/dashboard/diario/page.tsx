"use client";

import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import {
  CalendarDays,
  Menu,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pencil,
  X,
  Check,
} from "lucide-react";

// ==================== TYPES ====================

interface DailyEntry {
  day: number;
  income: number;
  recurring: { name: string; amount: number; icon: string }[];
  variable: number;
  salaryLabel?: string;
}

interface WeekSummary {
  label: string;
  startDay: number;
  endDay: number;
  spent: number;
  budget: number;
  isCurrent: boolean;
}

// ==================== DEMO DATA ====================

const DEMO_SALARY = { part1_amount: 3350, part1_day: 15, part2_amount: 3350, part2_day: 30 };

const DEMO_RECURRING_DAILY: Record<number, { name: string; amount: number; icon: string }[]> = {
  1:  [{ name: "Academia",           amount: 99,   icon: "💪" }, { name: "Cartão CPTM",      amount: 120,  icon: "🚇" }],
  5:  [{ name: "Aluguel",            amount: 1200, icon: "🏠" }, { name: "Condomínio",       amount: 600,  icon: "🏢" }, { name: "Plano de Saúde",  amount: 350,  icon: "💊" }, { name: "Parc. Empréstimo", amount: 800, icon: "🏦" }],
  10: [{ name: "Internet Fibra",     amount: 120,  icon: "📡" }, { name: "Celular",          amount: 80,   icon: "📱" }],
  12: [{ name: "Luz / Energia",      amount: 150,  icon: "💡" }],
  15: [{ name: "Spotify",            amount: 22,   icon: "🎵" }, { name: "Seguro Auto",      amount: 180,  icon: "🚗" }],
  18: [{ name: "Água",               amount: 60,   icon: "💧" }],
  20: [{ name: "Netflix",            amount: 40,   icon: "🎬" }, { name: "Prime Video",      amount: 19,   icon: "📺" }],
};

// Past actual variable spending (days already passed)
const DEMO_VARIABLE_PAST: Record<number, number> = {
  1: 45.90,
  2: 132.50,
  3: 0,
  4: 89.00,
  5: 0,
  6: 215.80,
  7: 67.30,
  8: 0,
  9: 178.40,
  10: 55.00,
  11: 0,
  12: 98.60,
  13: 143.20,
  14: 34.90,
  15: 312.00,
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getWeekday(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay(); // 0=Sun, 6=Sat
}

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmt(v: number, sign = false) {
  const s = Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (sign) return v >= 0 ? `+${s}` : `-${s}`;
  return s;
}

// ==================== BUILD DAILY DATA ====================

function buildDailyFlow(year: number, month: number, weeklyBudget: number) {
  const days = getDaysInMonth(year, month);
  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  let runningBalance = 1500; // opening balance from previous month
  const entries: (DailyEntry & {
    date: string;
    weekday: string;
    recurringTotal: number;
    totalExpense: number;
    net: number;
    balance: number;
    isPast: boolean;
    isToday: boolean;
    isFuture: boolean;
    isWeekend: boolean;
    isSalaryDay: boolean;
    salaryLabel?: string;
  })[] = [];

  for (let d = 1; d <= days; d++) {
    const wdIndex = getWeekday(year, month, d);
    const isWeekend = wdIndex === 0 || wdIndex === 6;
    const isPast = isCurrentMonth ? d < todayDay : true;
    const isToday = isCurrentMonth && d === todayDay;
    const isFuture = isCurrentMonth ? d > todayDay : false;

    // Income
    let income = 0;
    let salaryLabel: string | undefined;
    if (d === DEMO_SALARY.part1_day) {
      income += DEMO_SALARY.part1_amount;
      salaryLabel = `💰 Salário Parte 1 — ${fmt(DEMO_SALARY.part1_amount)}`;
    }
    if (d === DEMO_SALARY.part2_day) {
      income += DEMO_SALARY.part2_amount;
      salaryLabel = (salaryLabel ? salaryLabel + " | " : "") + `💰 Salário Parte 2 — ${fmt(DEMO_SALARY.part2_amount)}`;
    }

    // Recurring
    const recurring = DEMO_RECURRING_DAILY[d] ?? [];
    const recurringTotal = recurring.reduce((s, r) => s + r.amount, 0);

    // Variable (past = actual, future = 0)
    const variable = !isFuture ? (DEMO_VARIABLE_PAST[d] ?? 0) : 0;

    const totalExpense = recurringTotal + variable;
    const net = income - totalExpense;
    runningBalance += net;

    entries.push({
      day: d,
      date: `${String(d).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
      weekday: WEEKDAYS_PT[wdIndex],
      income,
      recurring,
      recurringTotal,
      variable,
      totalExpense,
      net,
      balance: runningBalance,
      isPast,
      isToday,
      isFuture,
      isWeekend,
      isSalaryDay: income > 0,
      salaryLabel,
    });
  }

  // Build weekly summaries (week = Mon–Sun)
  const weeks: WeekSummary[] = [];
  let weekStart = 1;

  while (weekStart <= days) {
    // Find the end of this week (next Sunday or end of month)
    const startWd = getWeekday(year, month, weekStart);
    // days until Sunday (0=Sun): if startWd=0 it's already Sunday
    const daysToSunday = startWd === 0 ? 0 : 7 - startWd;
    const weekEnd = Math.min(weekStart + daysToSunday, days);

    let spent = 0;
    for (let d = weekStart; d <= weekEnd; d++) {
      const entry = entries[d - 1];
      if (!entry.isFuture) {
        spent += entry.totalExpense;
      }
    }

    const isCurrentWeek = isCurrentMonth && todayDay >= weekStart && todayDay <= weekEnd;
    weeks.push({
      label: `${String(weekStart).padStart(2, "0")}/${String(month).padStart(2, "0")} – ${String(weekEnd).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
      startDay: weekStart,
      endDay: weekEnd,
      spent,
      budget: weeklyBudget,
      isCurrent: isCurrentWeek,
    });

    weekStart = weekEnd + 1;
  }

  return { entries, weeks };
}

// ==================== COMPONENT ====================

export default function DiarioPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [weeklyBudget, setWeeklyBudget] = useState(600);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("600");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showFuture, setShowFuture] = useState(true);

  const { entries, weeks } = useMemo(
    () => buildDailyFlow(viewYear, viewMonth, weeklyBudget),
    [viewYear, viewMonth, weeklyBudget]
  );

  const currentWeek = weeks.find((w) => w.isCurrent);
  const totalIncome = entries.reduce((s, e) => s + e.income, 0);
  const totalExpense = entries.filter((e) => !e.isFuture).reduce((s, e) => s + e.totalExpense, 0);
  const projectedExpense = entries.reduce((s, e) => s + e.recurringTotal, 0);

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function saveBudget() {
    const v = parseFloat(budgetInput);
    if (!isNaN(v) && v > 0) setWeeklyBudget(v);
    setEditingBudget(false);
  }

  const displayEntries = showFuture ? entries : entries.filter((e) => !e.isFuture);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? "" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-black/60 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setSidebarOpen(false)} />
        <div className={`absolute left-0 top-0 h-full w-64 bg-gray-900 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <Sidebar />
        </div>
      </div>
      <div className="hidden lg:block w-64 flex-shrink-0"><Sidebar /></div>

      <div className="flex-1 overflow-auto">
        {/* ======== HEADER ======== */}
        <div className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center gap-4">
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <CalendarDays className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Fluxo Diário</h1>
            <p className="text-xs text-gray-400">Acompanhamento dia a dia</p>
          </div>
          {/* Month picker */}
          <div className="ml-auto flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5">
            <button onClick={prevMonth} className="text-gray-400 hover:text-white transition"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold text-white w-28 text-center">{MONTHS_PT[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="text-gray-400 hover:text-white transition"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <label className="hidden sm:flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input type="checkbox" checked={showFuture} onChange={(e) => setShowFuture(e.target.checked)} className="accent-blue-500" />
            Mostrar futuros
          </label>
        </div>

        <div className="p-6 space-y-6">
          {/* ======== MONTH SUMMARY CARDS ======== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-gray-500">Renda do mês</span>
              </div>
              <p className="text-xl font-bold text-emerald-400">{fmt(totalIncome)}</p>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-xs text-gray-500">Gasto realizado</span>
              </div>
              <p className="text-xl font-bold text-red-400">{fmt(totalExpense)}</p>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-500">Projeção recorrentes</span>
              </div>
              <p className="text-xl font-bold text-amber-400">{fmt(projectedExpense)}</p>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-500">Saldo atual</span>
              </div>
              <p className={`text-xl font-bold ${entries.find((e) => e.isToday)?.balance ?? entries[entries.length - 1]?.balance >= 0 ? "text-blue-400" : "text-red-400"}`}>
                {fmt(entries.find((e) => e.isToday)?.balance ?? entries.filter((e) => !e.isFuture).at(-1)?.balance ?? 0)}
              </p>
            </div>
          </div>

          {/* ======== WEEKLY BUDGET TRACKER ======== */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">Orçamento Semanal</h2>
              </div>
              <div className="flex items-center gap-3">
                {editingBudget ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number" value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      className="w-28 bg-gray-800 border border-blue-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                      autoFocus onKeyDown={(e) => e.key === "Enter" && saveBudget()}
                    />
                    <button onClick={saveBudget} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingBudget(false)} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setBudgetInput(String(weeklyBudget)); setEditingBudget(true); }}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition">
                    <Pencil className="w-3.5 h-3.5" />
                    Teto: {fmt(weeklyBudget)}/semana
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {weeks.map((w, i) => {
                const pct = Math.min((w.spent / w.budget) * 100, 100);
                const over = w.spent > w.budget;
                const barColor = over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500";
                const textColor = over ? "text-red-400" : pct > 80 ? "text-amber-400" : "text-emerald-400";
                return (
                  <div key={i} className={`rounded-xl p-4 border transition ${
                    w.isCurrent
                      ? "border-blue-600 bg-blue-900/20"
                      : "border-gray-800 bg-gray-800/30"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 font-medium">Sem. {i + 1}</span>
                      {w.isCurrent && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Atual</span>}
                      {over && !w.isCurrent && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{w.label}</p>

                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className={`text-base font-bold ${textColor}`}>{fmt(w.spent)}</p>
                        <p className="text-xs text-gray-600">de {fmt(w.budget)}</p>
                      </div>
                      <div className="text-right">
                        {over ? (
                          <p className="text-xs font-medium text-red-400">+{fmt(w.spent - w.budget)} acima</p>
                        ) : (
                          <p className="text-xs font-medium text-gray-400">{fmt(w.budget - w.spent)} restam</p>
                        )}
                        <p className="text-xs text-gray-600">{pct.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======== DAILY FLOW TABLE ======== */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-bold text-white">Fluxo Dia a Dia</h2>
              <p className="text-xs text-gray-500 mt-1">
                🔵 Passado · 🟡 Hoje · ⚪ Projeção futura
              </p>
            </div>

            <div className="divide-y divide-gray-800/50">
              {displayEntries.map((entry) => {
                const isExpanded = expandedDay === entry.day;
                const hasDetails = entry.recurring.length > 0 || entry.income > 0 || entry.variable > 0;

                const rowBg = entry.isToday
                  ? "bg-blue-900/20 border-l-2 border-blue-500"
                  : entry.isSalaryDay && !entry.isFuture
                  ? "bg-emerald-900/10"
                  : entry.isFuture
                  ? "opacity-60"
                  : "";

                const netColor = entry.net > 0 ? "text-emerald-400" : entry.net < 0 ? "text-red-400" : "text-gray-500";
                const balColor = entry.balance > 0 ? "text-blue-300" : "text-red-400";

                return (
                  <div key={entry.day} className={rowBg}>
                    {/* Main row */}
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedDay(isExpanded ? null : hasDetails ? entry.day : null)}>
                      <div className="grid grid-cols-12 items-center gap-2 px-6 py-3 hover:bg-gray-800/30 transition">
                        {/* Date */}
                        <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            entry.isToday
                              ? "bg-blue-600 text-white"
                              : entry.isWeekend
                              ? "bg-gray-800 text-gray-500"
                              : entry.isFuture
                              ? "bg-gray-800/50 text-gray-600"
                              : "bg-gray-800 text-gray-200"
                          }`}>
                            {entry.day}
                          </div>
                          <span className="text-xs text-gray-500 hidden sm:block">{entry.weekday}</span>
                        </div>

                        {/* Events summary */}
                        <div className="col-span-5 sm:col-span-4 flex items-center gap-2 flex-wrap">
                          {entry.isFuture && (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Previsto
                            </span>
                          )}
                          {entry.isSalaryDay && (
                            <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded-full">
                              💰 Salário
                            </span>
                          )}
                          {entry.recurringTotal > 0 && (
                            <span className="text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded-full">
                              🔁 {fmt(entry.recurringTotal)}
                            </span>
                          )}
                          {entry.variable > 0 && (
                            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                              Variável {fmt(entry.variable)}
                            </span>
                          )}
                        </div>

                        {/* Income */}
                        <div className="col-span-0 sm:col-span-2 hidden sm:block text-right">
                          {entry.income > 0 && (
                            <span className="text-sm font-medium text-emerald-400">+{fmt(entry.income)}</span>
                          )}
                        </div>

                        {/* Net */}
                        <div className="col-span-2 text-right">
                          <span className={`text-sm font-bold ${netColor}`}>
                            {entry.net > 0 ? "+" : ""}{fmt(Math.abs(entry.net))}
                          </span>
                        </div>

                        {/* Balance */}
                        <div className="col-span-2 text-right">
                          <span className={`text-sm font-semibold ${balColor}`}>{fmt(entry.balance)}</span>
                          <p className="text-xs text-gray-600">saldo</p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-6 pb-4 bg-gray-800/20">
                        <div className="ml-10 space-y-2">
                          {/* Salary */}
                          {entry.salaryLabel && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0" />
                              <span className="text-emerald-300">{entry.salaryLabel}</span>
                            </div>
                          )}
                          {/* Recurring items */}
                          {entry.recurring.map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-400 flex-shrink-0" />
                                <span className="text-sm">{r.icon}</span>
                                <span className="text-gray-300">{r.name}</span>
                                <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">recorrente</span>
                              </div>
                              <span className="text-red-400 font-medium">{fmt(r.amount)}</span>
                            </div>
                          ))}
                          {/* Variable */}
                          {entry.variable > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
                                <span className="text-gray-300">Gastos variáveis do dia</span>
                              </div>
                              <span className="text-gray-400 font-medium">{fmt(entry.variable)}</span>
                            </div>
                          )}
                          {/* Summary line */}
                          <div className="flex justify-between pt-2 border-t border-gray-700 text-xs text-gray-500">
                            <span>Total do dia</span>
                            <div className="flex gap-4">
                              {entry.income > 0 && <span className="text-emerald-400">+{fmt(entry.income)} entrada</span>}
                              {entry.totalExpense > 0 && <span className="text-red-400">-{fmt(entry.totalExpense)} saída</span>}
                              <span className={entry.net >= 0 ? "text-emerald-400" : "text-red-400"}>
                                = {entry.net >= 0 ? "+" : ""}{fmt(Math.abs(entry.net))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Table footer */}
            <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/30 grid grid-cols-12 gap-2">
              <div className="col-span-7 sm:col-span-6 text-sm font-bold text-gray-300">Total do Mês</div>
              <div className="col-span-0 sm:col-span-2 hidden sm:block text-right text-sm font-bold text-emerald-400">
                +{fmt(totalIncome)}
              </div>
              <div className="col-span-2 text-right">
                <span className={`text-sm font-bold ${totalIncome - totalExpense >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalIncome - totalExpense >= 0 ? "+" : ""}{fmt(Math.abs(totalIncome - totalExpense))}
                </span>
              </div>
              <div className="col-span-3 text-right">
                <span className={`text-sm font-bold ${((entries[entries.length - 1]?.balance) ?? 0) >= 0 ? "text-blue-300" : "text-red-400"}`}>
                  {fmt((entries[entries.length - 1]?.balance) ?? 0)}
                </span>
                <p className="text-xs text-gray-600">saldo final</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
