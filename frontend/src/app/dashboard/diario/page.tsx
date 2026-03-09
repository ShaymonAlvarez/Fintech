"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import {
  CalendarDays,
  Menu,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Clock,
  AlertTriangle,
  Pencil,
  X,
  Check,
} from "lucide-react";

// ==================== TYPES ====================

interface DailyFlowItem {
  date: string;
  day_of_week: string;
  income: number;
  recurring_expenses: number;
  variable_expenses: number;
  total_expense: number;
  net: number;
  running_balance: number;
  is_today: boolean;
  is_future: boolean;
  events: string[];
}

interface WeekSummary {
  label: string;
  startDay: number;
  endDay: number;
  spent: number;
  budget: number;
  isCurrent: boolean;
}

const MONTHS_PT = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fmt(v: number, sign = false) {
  const s = Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (sign) return v >= 0 ? `+${s}` : `-${s}`;
  return s;
}

function getWeekday(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function buildWeeks(entries: DailyFlowItem[], year: number, month: number, weeklyBudget: number): WeekSummary[] {
  const days = getDaysInMonth(year, month);
  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const weeks: WeekSummary[] = [];
  let weekStart = 1;

  while (weekStart <= days) {
    const startWd = getWeekday(year, month, weekStart);
    const daysToSunday = startWd === 0 ? 0 : 7 - startWd;
    const weekEnd = Math.min(weekStart + daysToSunday, days);

    let spent = 0;
    for (let d = weekStart; d <= weekEnd; d++) {
      const entry = entries[d - 1];
      if (entry && !entry.is_future) {
        spent += entry.total_expense;
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

  return weeks;
}

// ==================== COMPONENT ====================

export default function DiarioPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [weeklyBudget, setWeeklyBudget] = useState(600);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("600");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showFuture, setShowFuture] = useState(true);
  const [entries, setEntries] = useState<DailyFlowItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [flowData, budgetData] = await Promise.allSettled([
        api.get(`/daily-flow?month=${viewMonth}&year=${viewYear}`),
        api.get("/weekly-budget"),
      ]);

      if (flowData.status === "fulfilled") {
        setEntries(flowData.value);
      }

      if (budgetData.status === "fulfilled") {
        setWeeklyBudget(budgetData.value.amount);
        setBudgetInput(String(budgetData.value.amount));
      }
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
    setLoading(false);
  }, [viewMonth, viewYear, router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setLoading(true);
    loadData();
  }, [loadData, router]);

  const weeks = useMemo(
    () => buildWeeks(entries, viewYear, viewMonth, weeklyBudget),
    [entries, viewYear, viewMonth, weeklyBudget]
  );

  const currentWeek = weeks.find((w) => w.isCurrent);
  const totalIncome = entries.reduce((s, e) => s + e.income, 0);
  const totalExpense = entries.filter((e) => !e.is_future).reduce((s, e) => s + e.total_expense, 0);
  const projectedExpense = entries.reduce((s, e) => s + e.recurring_expenses, 0);

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  async function saveBudget() {
    const v = parseFloat(budgetInput);
    if (!isNaN(v) && v > 0) {
      setWeeklyBudget(v);
      try {
        await api.post("/weekly-budget", { amount: v });
      } catch { /* silent */ }
    }
    setEditingBudget(false);
  }

  const displayEntries = showFuture ? entries : entries.filter((e) => !e.is_future);

  // Parse day from date string "YYYY-MM-DD"
  function dayFromDate(dateStr: string): number {
    return parseInt(dateStr.split("-")[2], 10);
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-950 text-gray-100 items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

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
              <p className={`text-xl font-bold ${(entries.find((e) => e.is_today)?.running_balance ?? entries.filter((e) => !e.is_future).at(-1)?.running_balance ?? 0) >= 0 ? "text-blue-400" : "text-red-400"}`}>
                {fmt(entries.find((e) => e.is_today)?.running_balance ?? entries.filter((e) => !e.is_future).at(-1)?.running_balance ?? 0)}
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

            {entries.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Nenhum dado para este mês</p>
                <p className="text-gray-600 text-xs mt-1">Configure seu salário e despesas recorrentes para ver o fluxo</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {displayEntries.map((entry) => {
                  const day = dayFromDate(entry.date);
                  const isExpanded = expandedDay === day;
                  const hasDetails = entry.events.length > 0;
                  const isWeekend = (() => {
                    const d = new Date(entry.date + "T12:00:00");
                    return d.getDay() === 0 || d.getDay() === 6;
                  })();
                  const isSalaryDay = entry.income > 0;

                  const rowBg = entry.is_today
                    ? "bg-blue-900/20 border-l-2 border-blue-500"
                    : isSalaryDay && !entry.is_future
                    ? "bg-emerald-900/10"
                    : entry.is_future
                    ? "opacity-60"
                    : "";

                  const netColor = entry.net > 0 ? "text-emerald-400" : entry.net < 0 ? "text-red-400" : "text-gray-500";
                  const balColor = entry.running_balance > 0 ? "text-blue-300" : "text-red-400";

                  return (
                    <div key={day} className={rowBg}>
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedDay(isExpanded ? null : hasDetails ? day : null)}>
                        <div className="grid grid-cols-12 items-center gap-2 px-6 py-3 hover:bg-gray-800/30 transition">
                          {/* Date */}
                          <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                              entry.is_today
                                ? "bg-blue-600 text-white"
                                : isWeekend
                                ? "bg-gray-800 text-gray-500"
                                : entry.is_future
                                ? "bg-gray-800/50 text-gray-600"
                                : "bg-gray-800 text-gray-200"
                            }`}>
                              {day}
                            </div>
                            <span className="text-xs text-gray-500 hidden sm:block">{entry.day_of_week}</span>
                          </div>

                          {/* Events summary */}
                          <div className="col-span-5 sm:col-span-4 flex items-center gap-2 flex-wrap">
                            {entry.is_future && (
                              <span className="text-xs text-gray-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Previsto
                              </span>
                            )}
                            {isSalaryDay && (
                              <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded-full">
                                💰 Salário
                              </span>
                            )}
                            {entry.recurring_expenses > 0 && (
                              <span className="text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded-full">
                                🔁 {fmt(entry.recurring_expenses)}
                              </span>
                            )}
                            {entry.variable_expenses > 0 && (
                              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                                Variável {fmt(entry.variable_expenses)}
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
                            <span className={`text-sm font-semibold ${balColor}`}>{fmt(entry.running_balance)}</span>
                            <p className="text-xs text-gray-600">saldo</p>
                          </div>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-6 pb-4 bg-gray-800/20">
                          <div className="ml-10 space-y-2">
                            {entry.events.map((evt, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                  evt.includes("Salário") ? "bg-emerald-400" : "bg-red-400"
                                }`} />
                                <span className={evt.includes("Salário") ? "text-emerald-300" : "text-gray-300"}>
                                  {evt}
                                </span>
                              </div>
                            ))}
                            {entry.variable_expenses > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
                                  <span className="text-gray-300">Gastos variáveis do dia</span>
                                </div>
                                <span className="text-gray-400 font-medium">{fmt(entry.variable_expenses)}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-gray-700 text-xs text-gray-500">
                              <span>Total do dia</span>
                              <div className="flex gap-4">
                                {entry.income > 0 && <span className="text-emerald-400">+{fmt(entry.income)} entrada</span>}
                                {entry.total_expense > 0 && <span className="text-red-400">-{fmt(entry.total_expense)} saída</span>}
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
            )}

            {/* Table footer */}
            {entries.length > 0 && (
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
                  <span className={`text-sm font-bold ${((entries[entries.length - 1]?.running_balance) ?? 0) >= 0 ? "text-blue-300" : "text-red-400"}`}>
                    {fmt((entries[entries.length - 1]?.running_balance) ?? 0)}
                  </span>
                  <p className="text-xs text-gray-600">saldo final</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
