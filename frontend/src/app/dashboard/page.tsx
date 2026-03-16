"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Wallet,
  CalendarDays,
  Sparkles,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SalaryModal from "@/components/SalaryModal";
import { api } from "@/lib/api";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

interface Summary {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

interface CategoryData {
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  percentage: number;
}

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  category_id: number | null;
  user_id: number;
  created_at: string;
  category: {
    id: number;
    name: string;
    icon: string;
    color: string;
  } | null;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface Budget {
  id: number;
  category_id: number;
  budget_amount: number;
}

interface SalaryConfig {
  total_amount: number;
}

interface ScenarioItem {
  id: number;
  category_name: string;
  icon: string;
  estimated_amount: number;
}

interface Scenario {
  id: number;
  name: string;
  icon: string;
  color: string;
  notes: string | null;
  items: ScenarioItem[];
  total_estimated: number;
}

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

interface CardData {
  id: number;
  bank_name: string;
  card_name: string;
}

interface CardInstallment {
  id: number;
  card_id: number;
  description: string;
  monthly_amount: number;
  total_installments: number;
  paid_installments: number;
  remaining_installments: number;
  start_date: string;
}

interface CardSubscription {
  id: number;
  card_id: number;
  description: string;
  monthly_amount: number;
  is_active: boolean;
}

interface Loan {
  id: number;
  name: string;
  bank_name: string | null;
  installment_amount: number;
  remaining_installments: number;
}

interface PlannerCardRow {
  id: string;
  title: string;
  amount: number;
  source: string;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthDiff(startDate: string, year: number, month: number) {
  const start = new Date(startDate);
  return (year - start.getFullYear()) * 12 + (month - (start.getMonth() + 1));
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [salary, setSalary] = useState<SalaryConfig | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [dailyFlow, setDailyFlow] = useState<DailyFlowItem[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [installments, setInstallments] = useState<CardInstallment[]>([]);
  const [subscriptions, setSubscriptions] = useState<CardSubscription[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);

  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState("expense");
  const [newDescription, setNewDescription] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newDate, setNewDate] = useState(ymd(new Date()));

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [s, c, t, cats, b, salaryCfg, scen, flow, cardList, loanList] = await Promise.all([
        api.get(`/reports/summary?month=${month}&year=${year}`),
        api.get(`/reports/by-category?month=${month}&year=${year}`),
        api.get(`/transactions?month=${month}&year=${year}&limit=500`),
        api.get("/categories"),
        api.get("/budgets"),
        api.get("/salary/config").catch(() => null),
        api.get(`/scenarios?month=${month}&year=${year}`),
        api.get(`/daily-flow?month=${month}&year=${year}`),
        api.get("/cards"),
        api.get("/loans"),
      ]);

      let allInstallments: CardInstallment[] = [];
      let allSubscriptions: CardSubscription[] = [];

      if (Array.isArray(cardList) && cardList.length > 0) {
        const details = await Promise.all(
          cardList.map(async (card: CardData) => {
            const [inst, subs] = await Promise.all([
              api.get(`/cards/${card.id}/installments`).catch(() => []),
              api.get(`/cards/${card.id}/subscriptions`).catch(() => []),
            ]);
            return { inst, subs };
          })
        );

        allInstallments = details.flatMap((d) => d.inst);
        allSubscriptions = details.flatMap((d) => d.subs);
      }

      setSummary(s);
      setCategoryData(c);
      setTransactions(t);
      setCategories(cats);
      setBudgets(b);
      setSalary(salaryCfg);
      setScenarios(scen);
      setDailyFlow(flow);
      setCards(cardList);
      setInstallments(allInstallments);
      setSubscriptions(allSubscriptions);
      setLoans(loanList);
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    }

    setLoading(false);
  }, [month, year, router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadData();
  }, [loadData, router]);

  const budgetMap = useMemo(() => {
    const map = new Map<number, number>();
    budgets.forEach((budget) => map.set(budget.category_id, budget.budget_amount));
    return map;
  }, [budgets]);

  const transactionsByDay = useMemo(() => {
    const grouped = new Map<string, Transaction[]>();
    transactions.forEach((transaction) => {
      const key = transaction.created_at.slice(0, 10);
      const current = grouped.get(key) || [];
      current.push(transaction);
      grouped.set(key, current);
    });
    return grouped;
  }, [transactions]);

  const scenarioByCategory = useMemo(() => {
    const map = new Map<string, number>();
    scenarios.forEach((scenario) => {
      scenario.items.forEach((item) => {
        map.set(item.category_name, (map.get(item.category_name) || 0) + item.estimated_amount);
      });
    });
    return map;
  }, [scenarios]);

  const totalScenario = scenarios.reduce((sum, scenario) => sum + scenario.items.reduce((acc, item) => acc + item.estimated_amount, 0), 0);
  const salaryTotal = salary?.total_amount || 0;
  const projectedBaseExpense = dailyFlow.reduce((sum, item) => sum + item.total_expense, 0);
  const openingBalance = dailyFlow.length > 0 ? dailyFlow[0].running_balance - dailyFlow[0].net : 0;
  const projectedMonthClosing = dailyFlow.at(-1)?.running_balance || 0;
  const projectedClosingWithScenarios = projectedMonthClosing - totalScenario;
  const canStillSpend = salaryTotal + openingBalance - (projectedBaseExpense + totalScenario);

  const categoryRows = useMemo(() => {
    return categories
      .map((category) => {
        const actual = categoryData.find((item) => item.category_id === category.id)?.total || 0;
        const plannedScenario = scenarioByCategory.get(category.name) || 0;
        const budget = budgetMap.get(category.id) || 0;
        return {
          ...category,
          budget,
          actual,
          plannedScenario,
          totalWithScenarios: actual + plannedScenario,
        };
      })
      .filter((row) => row.budget > 0 || row.actual > 0 || row.plannedScenario > 0)
      .sort((a, b) => b.totalWithScenarios - a.totalWithScenarios);
  }, [categories, categoryData, scenarioByCategory, budgetMap]);

  const vrvaRows = useMemo(() => {
    const targets = [
      ["Mercados/Feiras", "Mercado"],
      ["Restaurante", "Restaurante"],
      ["iFood", "Ifood"],
    ] as const;

    return targets.map(([categoryName, label]) => {
      const category = categories.find((item) => item.name === categoryName);
      const actualTransactions = transactions.filter((transaction) => transaction.category?.name === categoryName);
      const actual = actualTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const budget = category ? budgetMap.get(category.id) || 0 : 0;
      const frequency = actualTransactions.length;
      return {
        label,
        budget,
        actual,
        frequency,
        average: frequency > 0 ? actual / frequency : 0,
      };
    });
  }, [categories, transactions, budgetMap]);

  const vrvaTotalBudget = vrvaRows.reduce((sum, row) => sum + row.budget, 0);
  const vrvaTotalActual = vrvaRows.reduce((sum, row) => sum + row.actual, 0);

  const cardRows = useMemo(() => {
    const rows: PlannerCardRow[] = [];

    installments.forEach((installment) => {
      const diff = monthDiff(installment.start_date, year, month);
      if (diff >= 0 && diff < installment.remaining_installments) {
        const card = cards.find((item) => item.id === installment.card_id);
        rows.push({
          id: `inst-${installment.id}`,
          title: `${installment.description} ${installment.paid_installments + diff + 1}/${installment.total_installments}`,
          amount: installment.monthly_amount,
          source: card ? `${card.bank_name} ${card.card_name}` : "Cartão",
        });
      }
    });

    subscriptions.filter((subscription) => subscription.is_active).forEach((subscription) => {
      const card = cards.find((item) => item.id === subscription.card_id);
      rows.push({
        id: `sub-${subscription.id}`,
        title: subscription.description,
        amount: subscription.monthly_amount,
        source: card ? `${card.bank_name} ${card.card_name}` : "Cartão",
      });
    });

    loans.forEach((loan) => {
      rows.push({
        id: `loan-${loan.id}`,
        title: `${loan.name}${loan.remaining_installments > 0 ? ` (${loan.remaining_installments} restantes)` : ""}`,
        amount: loan.installment_amount,
        source: loan.bank_name || "Empréstimo",
      });
    });

    return rows.sort((a, b) => b.amount - a.amount);
  }, [installments, subscriptions, loans, cards, year, month]);

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm("Remover esta transação?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      loadData();
    } catch (error) {
      console.error("Erro ao remover:", error);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/transactions", {
        amount: parseFloat(newAmount),
        type: newType,
        description: newDescription,
        category_id: newCategoryId ? parseInt(newCategoryId) : null,
        created_at: newDate ? `${newDate}T12:00:00` : null,
      });
      setShowAddModal(false);
      setNewAmount("");
      setNewDescription("");
      setNewCategoryId("");
      setNewType("expense");
      setNewDate(ymd(new Date()));
      loadData();
    } catch (error) {
      console.error("Erro ao adicionar:", error);
    }
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-[#0a0a1a]/90 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-gray-400">
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base sm:text-lg font-semibold text-white min-w-[170px] text-center">
                  {MONTHS[month - 1]} - {year}
                </h2>
                <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSalaryModal(true)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition-all"
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Salário</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-500 hover:to-indigo-500 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nova Transação</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
          {loading ? (
            <div className="space-y-6">
              <div className="h-64 rounded-2xl shimmer bg-[#1a1a2e]" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-72 rounded-2xl shimmer bg-[#1a1a2e]" />
                <div className="h-72 rounded-2xl shimmer bg-[#1a1a2e]" />
              </div>
              <div className="h-96 rounded-2xl shimmer bg-[#1a1a2e]" />
            </div>
          ) : (
            <>
              <section className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-[#5f0c05] via-[#4b0904] to-[#360603] overflow-hidden shadow-2xl shadow-red-950/40">
                <div className="px-6 py-4 border-b border-white/10 text-center bg-cyan-500/20">
                  <h1 className="text-2xl font-bold text-cyan-100">{MONTHS[month - 1].toLowerCase()} - {year}</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 border-b border-white/10 text-sm">
                  <div className="px-4 py-3 text-zinc-100 border-r border-white/10 md:col-span-2">Gasto por mês previsto / já comprometido:</div>
                  <div className="px-4 py-3 font-semibold text-white border-r border-white/10">{fmt(projectedBaseExpense)} / {fmt(projectedBaseExpense + totalScenario)}</div>
                  <div className="px-4 py-3 text-zinc-100 border-r border-white/10">O quanto ainda pode gastar:</div>
                  <div className={`px-4 py-3 font-semibold ${canStillSpend >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmt(canStillSpend)}</div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[220px,1fr,320px] gap-0">
                  <div className="bg-amber-800/80 p-6 flex flex-col justify-center border-r border-white/10 min-h-[220px]">
                    <p className="text-4xl font-light text-amber-50 leading-tight">Metas -</p>
                    <p className="text-4xl font-light text-amber-50 leading-tight">Salário:</p>
                    <p className="text-5xl font-semibold text-amber-100 mt-2">{salaryTotal > 0 ? fmt(salaryTotal) : "—"}</p>
                    <div className="mt-4 space-y-2 text-sm text-amber-100/80">
                      <p>Saldo de entrada: {fmt(openingBalance)}</p>
                      <p>Saldo projetado: {fmt(projectedClosingWithScenarios)}</p>
                      <p>Referência atual: {fmt(summary?.balance || 0)}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto border-r border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-amber-900/80 text-amber-50">
                          <th className="px-4 py-3 text-left">Categorias</th>
                          <th className="px-4 py-3 text-right">Máximo Previsto</th>
                          <th className="px-4 py-3 text-right">Atual</th>
                          <th className="px-4 py-3 text-right">Cenários</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryRows.map((row) => (
                          <tr key={row.id} className="border-t border-black/30 text-amber-50/95">
                            <td className="px-4 py-2.5 font-medium">{row.icon} {row.name}</td>
                            <td className="px-4 py-2.5 text-right">{row.budget > 0 ? fmt(row.budget) : "R$ 0,00"}</td>
                            <td className="px-4 py-2.5 text-right">{fmt(row.actual)}</td>
                            <td className="px-4 py-2.5 text-right">{row.plannedScenario > 0 ? fmt(row.plannedScenario) : "—"}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-white/10 bg-red-700/40 text-white font-semibold">
                          <td className="px-4 py-3">Total dos meus gastos</td>
                          <td className="px-4 py-3 text-right">{fmt(categoryRows.reduce((sum, row) => sum + row.budget, 0))}</td>
                          <td className="px-4 py-3 text-right">{fmt(summary?.total_expense || 0)}</td>
                          <td className="px-4 py-3 text-right">{fmt(totalScenario)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 sm:p-6 bg-[#4d0c06]/60">
                    <div className="flex items-center gap-2 text-amber-100 mb-4">
                      <PiggyBank className="w-4 h-4" />
                      <h3 className="font-semibold">Resumo do mês</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between text-amber-50">
                        <span>Receitas do mês</span>
                        <span className="font-semibold">{fmt(summary?.total_income || 0)}</span>
                      </div>
                      <div className="flex justify-between text-amber-50">
                        <span>Despesas realizadas</span>
                        <span className="font-semibold">{fmt(summary?.total_expense || 0)}</span>
                      </div>
                      <div className="flex justify-between text-amber-50">
                        <span>Planejado em cenários</span>
                        <span className="font-semibold">{fmt(totalScenario)}</span>
                      </div>
                      <div className="flex justify-between text-amber-50">
                        <span>Saldo no mês</span>
                        <span className={`font-semibold ${(summary?.balance || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmt(summary?.balance || 0)}</span>
                      </div>
                      <div className="flex justify-between text-amber-50">
                        <span>Saldo futuro previsto</span>
                        <span className={`font-semibold ${projectedClosingWithScenarios >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmt(projectedClosingWithScenarios)}</span>
                      </div>
                      <div className="pt-3 border-t border-white/10 text-amber-100/80 text-xs">{scenarios.length} cenário(s) influenciando o mês · {summary?.transaction_count || 0} lançamento(s)</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl bg-[#1a1a2e] border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Cenários cadastrados para este mês</h3>
                </div>
                {scenarios.length === 0 ? (
                  <div className="px-6 py-8 text-sm text-gray-400">Nenhum cenário cadastrado para {MONTHS[month - 1]}.</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
                    {scenarios.map((scenario) => (
                      <div key={scenario.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-white font-semibold text-lg">{scenario.icon} {scenario.name}</h4>
                            {scenario.notes && <p className="text-sm text-gray-400 mt-1">{scenario.notes}</p>}
                          </div>
                          <span className="text-yellow-400 font-semibold">{fmt(scenario.total_estimated)}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {scenario.items.map((item) => (
                            <span key={item.id} className="px-3 py-1 rounded-full text-xs bg-white/5 text-gray-300 border border-white/5">
                              {item.icon} {item.category_name} · {fmt(item.estimated_amount)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section className="rounded-2xl bg-[#1a1a2e] border border-white/10 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-lg font-semibold text-white">VR / VA</h3>
                    </div>
                    <div className="text-sm text-gray-400">{fmt(vrvaTotalActual)} / {fmt(vrvaTotalBudget)}</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/[0.03] text-gray-400">
                        <tr>
                          <th className="px-4 py-3 text-left">Categoria</th>
                          <th className="px-4 py-3 text-right">Previsto</th>
                          <th className="px-4 py-3 text-right">Atual</th>
                          <th className="px-4 py-3 text-right">Quantidade</th>
                          <th className="px-4 py-3 text-right">Média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vrvaRows.map((row) => (
                          <tr key={row.label} className="border-t border-white/5 text-gray-200">
                            <td className="px-4 py-3">{row.label}</td>
                            <td className="px-4 py-3 text-right">{fmt(row.budget)}</td>
                            <td className="px-4 py-3 text-right">{fmt(row.actual)}</td>
                            <td className="px-4 py-3 text-right">{row.frequency || "—"}</td>
                            <td className="px-4 py-3 text-right">{row.frequency > 0 ? fmt(row.average) : "—"}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-white/10 font-semibold text-white bg-white/[0.03]">
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right">{fmt(vrvaTotalBudget)}</td>
                          <td className="px-4 py-3 text-right">{fmt(vrvaTotalActual)}</td>
                          <td className="px-4 py-3 text-right">{vrvaRows.reduce((sum, row) => sum + row.frequency, 0)}</td>
                          <td className="px-4 py-3 text-right">{vrvaRows.reduce((sum, row) => sum + row.frequency, 0) > 0 ? fmt(vrvaTotalActual / vrvaRows.reduce((sum, row) => sum + row.frequency, 0)) : "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl bg-[#1f2125] border border-white/10 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-slate-300" />
                    <h3 className="text-lg font-semibold text-white">Lançamentos no cartão / compromissos do mês</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/[0.04] text-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-left">Descrição</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                          <th className="px-4 py-3 text-left">Origem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cardRows.length === 0 ? (
                          <tr>
                            <td className="px-4 py-6 text-gray-400" colSpan={3}>Nenhum lançamento de cartão ou empréstimo neste mês.</td>
                          </tr>
                        ) : (
                          cardRows.map((row) => (
                            <tr key={row.id} className="border-t border-white/5 text-gray-200">
                              <td className="px-4 py-3">{row.title}</td>
                              <td className="px-4 py-3 text-right">{fmt(row.amount)}</td>
                              <td className="px-4 py-3 text-gray-400">{row.source}</td>
                            </tr>
                          ))
                        )}
                        {cardRows.length > 0 && (
                          <tr className="border-t border-white/10 bg-white/[0.04] text-white font-semibold">
                            <td className="px-4 py-3">Total</td>
                            <td className="px-4 py-3 text-right">{fmt(cardRows.reduce((sum, row) => sum + row.amount, 0))}</td>
                            <td className="px-4 py-3" />
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <section className="rounded-2xl bg-[#1a1a2e] border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Fluxo diário detalhado do mês</h3>
                </div>

                <div className="px-6 py-4 grid grid-cols-2 lg:grid-cols-5 gap-4 border-b border-white/10 bg-white/[0.03]">
                  <div>
                    <p className="text-xs text-gray-500">Saldo de entrada</p>
                    <p className="text-lg font-semibold text-white">{fmt(openingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Renda do mês</p>
                    <p className="text-lg font-semibold text-emerald-400">{fmt(summary?.total_income || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Saída do mês</p>
                    <p className="text-lg font-semibold text-red-400">{fmt(summary?.total_expense || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Projeção base</p>
                    <p className="text-lg font-semibold text-amber-400">{fmt(projectedBaseExpense)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Saldo futuro</p>
                    <p className={`text-lg font-semibold ${projectedClosingWithScenarios >= 0 ? "text-blue-300" : "text-red-400"}`}>{fmt(projectedClosingWithScenarios)}</p>
                  </div>
                </div>

                <div className="divide-y divide-white/5">
                  {dailyFlow.map((day) => {
                    const dayTransactions = transactionsByDay.get(day.date) || [];
                    const dayNumber = Number(day.date.slice(8, 10));
                    return (
                      <div key={day.date} className={`px-6 py-4 ${day.is_today ? "bg-blue-500/10" : ""}`}>
                        <div className="grid grid-cols-1 lg:grid-cols-[120px,1fr,220px] gap-4 items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold ${day.is_today ? "bg-blue-500 text-white" : day.is_future ? "bg-white/5 text-gray-500" : "bg-white/10 text-white"}`}>
                                {dayNumber}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{day.day_of_week}</p>
                                <p className="text-xs text-gray-500">{day.date}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {day.events.map((event, index) => (
                              <div key={`${day.date}-${index}`} className="text-sm text-gray-300 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
                                {event}
                              </div>
                            ))}

                            {dayTransactions.map((transaction) => (
                              <div key={transaction.id} className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 bg-white/[0.02] border border-white/5">
                                <div className="min-w-0">
                                  <p className="text-sm text-white truncate">{transaction.category?.icon || "📦"} {transaction.description || transaction.category?.name || "Sem descrição"}</p>
                                  <p className="text-xs text-gray-500">{transaction.category?.name || "Sem categoria"}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm font-semibold ${transaction.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                                    {transaction.type === "income" ? "+" : "-"}{fmt(transaction.amount)}
                                  </span>
                                  <button onClick={() => handleDeleteTransaction(transaction.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                                    remover
                                  </button>
                                </div>
                              </div>
                            ))}

                            {day.events.length === 0 && dayTransactions.length === 0 && (
                              <div className="text-sm text-gray-600">Sem lançamentos neste dia.</div>
                            )}
                          </div>

                          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Entradas</span>
                              <span className="text-emerald-400 font-medium">{fmt(day.income)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Recorrentes</span>
                              <span className="text-red-300 font-medium">{fmt(day.recurring_expenses)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Variáveis</span>
                              <span className="text-red-400 font-medium">{fmt(day.variable_expenses)}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-white/5 pt-2">
                              <span className="text-gray-400">Saldo do dia</span>
                              <span className={`font-semibold ${day.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{day.net >= 0 ? "+" : "-"}{fmt(Math.abs(day.net))}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Saldo acumulado</span>
                              <span className={`font-semibold ${day.running_balance >= 0 ? "text-blue-300" : "text-red-400"}`}>{fmt(day.running_balance)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Nova Transação</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewType("expense")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    newType === "expense"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
                  }`}
                >
                  📤 Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setNewType("income")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    newType === "income"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
                  }`}
                >
                  📥 Receita
                </button>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg font-semibold placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Descrição</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  placeholder="Ex: Mercado, Salário..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Data</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Categoria</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                >
                  <option value="" className="bg-[#1a1a2e]">Selecionar...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-[#1a1a2e]">
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all">
                Adicionar
              </button>
            </form>
          </div>
        </div>
      )}

      {showSalaryModal && (
        <SalaryModal
          onClose={() => setShowSalaryModal(false)}
          onSaved={() => {
            setShowSalaryModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
