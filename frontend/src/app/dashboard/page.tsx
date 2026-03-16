"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Wallet,
  CalendarDays,
  Sparkles,
  CreditCard,
  PiggyBank,
  Users,
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

type PanelKey = "summary" | "scenarios" | "vrva" | "partner" | "cards" | "daily";

interface Summary {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

interface CategoryData {
  category_id: number;
  category_name: string;
  total: number;
}

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
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

interface PartnerExpense {
  id: number;
  description: string;
  amount: number;
  source: string | null;
  note: string | null;
  charge_date: string;
  is_paid: boolean;
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

function dayLabel(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

function SectionShell({
  title,
  icon,
  open,
  onToggle,
  actions,
  children,
  className = "bg-[#1a1a2e] border border-white/10",
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl overflow-hidden ${className}`}>
      <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
        <button onClick={onToggle} className="flex items-center gap-2 min-w-0 text-left">
          {icon}
          <h3 className="text-base sm:text-lg font-semibold text-white truncate">{title}</h3>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {actions}
      </div>
      {open && children}
    </section>
  );
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
  const [partnerExpenses, setPartnerExpenses] = useState<PartnerExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState("expense");
  const [newDescription, setNewDescription] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newDate, setNewDate] = useState(ymd(new Date()));

  const [partnerDescription, setPartnerDescription] = useState("");
  const [partnerAmount, setPartnerAmount] = useState("");
  const [partnerSource, setPartnerSource] = useState("");
  const [partnerNote, setPartnerNote] = useState("");
  const [partnerDate, setPartnerDate] = useState(ymd(new Date()));
  const [partnerPaid, setPartnerPaid] = useState(false);

  const [panelOpen, setPanelOpen] = useState<Record<PanelKey, boolean>>({
    summary: true,
    scenarios: true,
    vrva: true,
    partner: true,
    cards: true,
    daily: true,
  });
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [s, c, t, cats, b, salaryCfg, scen, flow, cardList, loanList, partnerList] = await Promise.all([
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
        api.get(`/partner-expenses?month=${month}&year=${year}`).catch(() => []),
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
      setPartnerExpenses(partnerList);
      setOpenDays(
        Object.fromEntries(
          (flow as DailyFlowItem[]).map((day) => [day.date, day.is_today])
        )
      );
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
        };
      })
      .filter((row) => row.budget > 0 || row.actual > 0 || row.plannedScenario > 0)
      .sort((a, b) => (b.actual + b.plannedScenario) - (a.actual + a.plannedScenario));
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

  const allPanelsExpanded = Object.values(panelOpen).every(Boolean);
  const allDaysExpanded = dailyFlow.length > 0 && dailyFlow.every((day) => openDays[day.date]);

  const togglePanel = (panel: PanelKey) => {
    setPanelOpen((current) => ({ ...current, [panel]: !current[panel] }));
  };

  const toggleAllPanels = () => {
    const next = !allPanelsExpanded;
    setPanelOpen({
      summary: next,
      scenarios: next,
      vrva: next,
      partner: next,
      cards: next,
      daily: next,
    });
  };

  const toggleDay = (date: string) => {
    setOpenDays((current) => ({ ...current, [date]: !current[date] }));
  };

  const toggleAllDays = () => {
    const next = !allDaysExpanded;
    setOpenDays(Object.fromEntries(dailyFlow.map((day) => [day.date, next])));
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm("Remover esta transação?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      loadData();
    } catch (error) {
      console.error("Erro ao remover:", error);
    }
  };

  const handleDeletePartner = async (id: number) => {
    if (!confirm("Remover este lançamento?")) return;
    try {
      await api.delete(`/partner-expenses/${id}`);
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

  const handleAddPartnerExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/partner-expenses", {
        description: partnerDescription,
        amount: parseFloat(partnerAmount),
        source: partnerSource || null,
        note: partnerNote || null,
        charge_date: partnerDate ? `${partnerDate}T12:00:00` : null,
        is_paid: partnerPaid,
      });
      setShowPartnerModal(false);
      setPartnerDescription("");
      setPartnerAmount("");
      setPartnerSource("");
      setPartnerNote("");
      setPartnerDate(ymd(new Date()));
      setPartnerPaid(false);
      loadData();
    } catch (error) {
      console.error("Erro ao adicionar lançamento da esposa:", error);
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
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-gray-400">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1 sm:gap-3 min-w-0">
                <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-sm sm:text-lg font-semibold text-white min-w-[150px] sm:min-w-[190px] text-center truncate">
                  {MONTHS[month - 1]} - {year}
                </h2>
                <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button onClick={toggleAllPanels} className="px-3 py-2 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5">
                {allPanelsExpanded ? "Recolher painéis" : "Expandir painéis"}
              </button>
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
              <SectionShell
                title="Painel mensal consolidado"
                icon={<PiggyBank className="w-5 h-5 text-red-300" />}
                open={panelOpen.summary}
                onToggle={() => togglePanel("summary")}
                className="border border-red-500/20 bg-gradient-to-br from-[#5f0c05] via-[#4b0904] to-[#360603]"
              >
                <div className="px-4 sm:px-6 py-4 border-t border-white/10 text-center bg-cyan-500/20">
                  <h1 className="text-xl sm:text-2xl font-bold text-cyan-100">{MONTHS[month - 1].toLowerCase()} - {year}</h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 border-t border-white/10 text-sm">
                  <div className="px-4 py-3 text-zinc-100 border-r border-white/10 md:col-span-2">Gasto por mês previsto / já comprometido:</div>
                  <div className="px-4 py-3 font-semibold text-white border-r border-white/10">{fmt(projectedBaseExpense)} / {fmt(projectedBaseExpense + totalScenario)}</div>
                  <div className="px-4 py-3 text-zinc-100 border-r border-white/10">O quanto ainda pode gastar:</div>
                  <div className={`px-4 py-3 font-semibold ${canStillSpend >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmt(canStillSpend)}</div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[220px,1fr,320px]">
                  <div className="bg-amber-800/80 p-6 flex flex-col justify-center border-r border-white/10 min-h-[220px]">
                    <p className="text-3xl sm:text-4xl font-light text-amber-50 leading-tight">Metas -</p>
                    <p className="text-3xl sm:text-4xl font-light text-amber-50 leading-tight">Salário:</p>
                    <p className="text-4xl sm:text-5xl font-semibold text-amber-100 mt-2 break-words">{salaryTotal > 0 ? fmt(salaryTotal) : "—"}</p>
                    <div className="mt-4 space-y-2 text-sm text-amber-100/80">
                      <p>Saldo de entrada: {fmt(openingBalance)}</p>
                      <p>Saldo projetado: {fmt(projectedClosingWithScenarios)}</p>
                      <p>Referência atual: {fmt(summary?.balance || 0)}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto border-r border-white/10">
                    <table className="w-full text-sm min-w-[520px]">
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
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 sm:p-6 bg-[#4d0c06]/60">
                    <div className="space-y-3 text-sm text-amber-50">
                      <div className="flex justify-between"><span>Receitas do mês</span><span className="font-semibold">{fmt(summary?.total_income || 0)}</span></div>
                      <div className="flex justify-between"><span>Despesas realizadas</span><span className="font-semibold">{fmt(summary?.total_expense || 0)}</span></div>
                      <div className="flex justify-between"><span>Planejado em cenários</span><span className="font-semibold">{fmt(totalScenario)}</span></div>
                      <div className="flex justify-between"><span>Saldo no mês</span><span className={`font-semibold ${(summary?.balance || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmt(summary?.balance || 0)}</span></div>
                      <div className="flex justify-between"><span>Saldo futuro previsto</span><span className={`font-semibold ${projectedClosingWithScenarios >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmt(projectedClosingWithScenarios)}</span></div>
                    </div>
                  </div>
                </div>
              </SectionShell>

              <SectionShell
                title="Cenários cadastrados para este mês"
                icon={<Sparkles className="w-5 h-5 text-yellow-400" />}
                open={panelOpen.scenarios}
                onToggle={() => togglePanel("scenarios")}
              >
                {scenarios.length === 0 ? (
                  <div className="px-6 py-8 text-sm text-gray-400">Nenhum cenário cadastrado para {MONTHS[month - 1]}.</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 sm:p-6">
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
              </SectionShell>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SectionShell
                  title="VR / VA"
                  icon={<Wallet className="w-5 h-5 text-emerald-400" />}
                  open={panelOpen.vrva}
                  onToggle={() => togglePanel("vrva")}
                  actions={<div className="text-sm text-gray-400">{fmt(vrvaTotalActual)} / {fmt(vrvaTotalBudget)}</div>}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
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
                      </tbody>
                    </table>
                  </div>
                </SectionShell>

                <SectionShell
                  title="Lançamentos da esposa / reembolso"
                  icon={<Users className="w-5 h-5 text-slate-300" />}
                  open={panelOpen.partner}
                  onToggle={() => togglePanel("partner")}
                  className="bg-[#2a2b30] border border-white/10"
                  actions={
                    <button onClick={() => setShowPartnerModal(true)} className="px-3 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15">
                      Novo
                    </button>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead className="bg-white/[0.04] text-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-left">Descrição</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                          <th className="px-4 py-3 text-left">Origem</th>
                          <th className="px-4 py-3 text-left">Data</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partnerExpenses.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-6 text-gray-400">Nenhum lançamento da esposa neste mês.</td></tr>
                        ) : (
                          partnerExpenses.map((expense) => (
                            <tr key={expense.id} className="border-t border-white/5 text-gray-200">
                              <td className="px-4 py-3">{expense.description}{expense.note ? <span className="block text-xs text-gray-500">{expense.note}</span> : null}</td>
                              <td className="px-4 py-3 text-right">{fmt(expense.amount)}</td>
                              <td className="px-4 py-3 text-gray-400">{expense.source || "—"}</td>
                              <td className="px-4 py-3">{dayLabel(expense.charge_date)}</td>
                              <td className="px-4 py-3">{expense.is_paid ? <span className="text-emerald-400">Pago</span> : <span className="text-amber-400">Em aberto</span>}</td>
                              <td className="px-4 py-3 text-right"><button onClick={() => handleDeletePartner(expense.id)} className="text-xs text-gray-400 hover:text-red-400">remover</button></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </SectionShell>
              </div>

              <SectionShell
                title="Lançamentos no cartão / compromissos do mês"
                icon={<CreditCard className="w-5 h-5 text-slate-300" />}
                open={panelOpen.cards}
                onToggle={() => togglePanel("cards")}
                className="bg-[#1f2125] border border-white/10"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead className="bg-white/[0.04] text-gray-300">
                      <tr>
                        <th className="px-4 py-3 text-left">Descrição</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-left">Origem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cardRows.length === 0 ? (
                        <tr><td className="px-4 py-6 text-gray-400" colSpan={3}>Nenhum lançamento de cartão ou empréstimo neste mês.</td></tr>
                      ) : (
                        cardRows.map((row) => (
                          <tr key={row.id} className="border-t border-white/5 text-gray-200">
                            <td className="px-4 py-3">{row.title}</td>
                            <td className="px-4 py-3 text-right">{fmt(row.amount)}</td>
                            <td className="px-4 py-3 text-gray-400">{row.source}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionShell>

              <SectionShell
                title="Fluxo diário detalhado do mês"
                icon={<CalendarDays className="w-5 h-5 text-blue-400" />}
                open={panelOpen.daily}
                onToggle={() => togglePanel("daily")}
                actions={
                  <button onClick={toggleAllDays} className="px-3 py-2 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5">
                    {allDaysExpanded ? "Recolher dias" : "Expandir dias"}
                  </button>
                }
              >
                <div className="px-4 sm:px-6 py-4 grid grid-cols-2 lg:grid-cols-5 gap-4 border-b border-white/10 bg-white/[0.03]">
                  <div><p className="text-xs text-gray-500">Saldo de entrada</p><p className="text-lg font-semibold text-white">{fmt(openingBalance)}</p></div>
                  <div><p className="text-xs text-gray-500">Renda do mês</p><p className="text-lg font-semibold text-emerald-400">{fmt(summary?.total_income || 0)}</p></div>
                  <div><p className="text-xs text-gray-500">Saída do mês</p><p className="text-lg font-semibold text-red-400">{fmt(summary?.total_expense || 0)}</p></div>
                  <div><p className="text-xs text-gray-500">Projeção base</p><p className="text-lg font-semibold text-amber-400">{fmt(projectedBaseExpense)}</p></div>
                  <div><p className="text-xs text-gray-500">Saldo futuro</p><p className={`text-lg font-semibold ${projectedClosingWithScenarios >= 0 ? "text-blue-300" : "text-red-400"}`}>{fmt(projectedClosingWithScenarios)}</p></div>
                </div>
                <div className="divide-y divide-white/5">
                  {dailyFlow.map((day) => {
                    const dayTransactions = transactionsByDay.get(day.date) || [];
                    const expanded = !!openDays[day.date];
                    const dayNumber = Number(day.date.slice(8, 10));
                    return (
                      <div key={day.date} className={`${day.is_today ? "bg-blue-500/10" : ""}`}>
                        <button onClick={() => toggleDay(day.date)} className="w-full px-4 sm:px-6 py-4 text-left hover:bg-white/[0.02] transition">
                          <div className="grid grid-cols-1 md:grid-cols-[150px,1fr,160px] gap-4 items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold ${day.is_today ? "bg-blue-500 text-white" : day.is_future ? "bg-white/5 text-gray-500" : "bg-white/10 text-white"}`}>{dayNumber}</div>
                              <div>
                                <p className="text-sm font-medium text-white">{day.day_of_week}</p>
                                <p className="text-xs text-gray-500">{day.date}</p>
                              </div>
                              {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {day.events.slice(0, expanded ? day.events.length : 2).map((event, index) => (
                                <span key={`${day.date}-${index}`} className="text-xs text-gray-300 bg-white/[0.04] border border-white/5 rounded-full px-3 py-1">{event}</span>
                              ))}
                              {!expanded && day.events.length > 2 && <span className="text-xs text-gray-500">+{day.events.length - 2} eventos</span>}
                            </div>
                            <div className="text-left md:text-right">
                              <p className={`text-sm font-semibold ${day.running_balance >= 0 ? "text-blue-300" : "text-red-400"}`}>{fmt(day.running_balance)}</p>
                              <p className="text-xs text-gray-500">saldo acumulado</p>
                            </div>
                          </div>
                        </button>

                        {expanded && (
                          <div className="px-4 sm:px-6 pb-4">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr,220px] gap-4">
                              <div className="space-y-2">
                                {day.events.map((event, index) => (
                                  <div key={`${day.date}-full-${index}`} className="text-sm text-gray-300 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">{event}</div>
                                ))}
                                {dayTransactions.map((transaction) => (
                                  <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl px-3 py-3 bg-white/[0.02] border border-white/5">
                                    <div className="min-w-0">
                                      <p className="text-sm text-white break-words">{transaction.category?.icon || "📦"} {transaction.description || transaction.category?.name || "Sem descrição"}</p>
                                      <p className="text-xs text-gray-500">{transaction.category?.name || "Sem categoria"}</p>
                                    </div>
                                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                                      <span className={`text-sm font-semibold ${transaction.type === "income" ? "text-emerald-400" : "text-red-400"}`}>{transaction.type === "income" ? "+" : "-"}{fmt(transaction.amount)}</span>
                                      <button onClick={() => handleDeleteTransaction(transaction.id)} className="text-xs text-gray-500 hover:text-red-400">remover</button>
                                    </div>
                                  </div>
                                ))}
                                {day.events.length === 0 && dayTransactions.length === 0 && <div className="text-sm text-gray-600">Sem lançamentos neste dia.</div>}
                              </div>
                              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 space-y-2 h-fit">
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Entradas</span><span className="text-emerald-400 font-medium">{fmt(day.income)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Recorrentes</span><span className="text-red-300 font-medium">{fmt(day.recurring_expenses)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Variáveis</span><span className="text-red-400 font-medium">{fmt(day.variable_expenses)}</span></div>
                                <div className="flex justify-between text-sm border-t border-white/5 pt-2"><span className="text-gray-400">Saldo do dia</span><span className={`font-semibold ${day.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{day.net >= 0 ? "+" : "-"}{fmt(Math.abs(day.net))}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-400">Saldo acumulado</span><span className={`font-semibold ${day.running_balance >= 0 ? "text-blue-300" : "text-red-400"}`}>{fmt(day.running_balance)}</span></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SectionShell>
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
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewType("expense")} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${newType === "expense" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"}`}>📤 Despesa</button>
                <button type="button" onClick={() => setNewType("income")} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${newType === "income" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"}`}>📥 Receita</button>
              </div>
              <input type="number" step="0.01" min="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Valor" required />
              <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Descrição" />
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
              <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white">
                <option value="" className="bg-[#1a1a2e]">Selecionar categoria</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id} className="bg-[#1a1a2e]">{cat.icon} {cat.name}</option>)}
              </select>
              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold">Adicionar</button>
            </form>
          </div>
        </div>
      )}

      {showPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPartnerModal(false)} />
          <div className="relative bg-[#1f2125] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Novo lançamento da esposa</h3>
              <button onClick={() => setShowPartnerModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddPartnerExpense} className="space-y-4">
              <input type="text" value={partnerDescription} onChange={(e) => setPartnerDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Descrição" required />
              <input type="number" step="0.01" min="0.01" value={partnerAmount} onChange={(e) => setPartnerAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Valor" required />
              <input type="text" value={partnerSource} onChange={(e) => setPartnerSource(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Origem / cartão" />
              <input type="text" value={partnerNote} onChange={(e) => setPartnerNote(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Observação" />
              <input type="date" value={partnerDate} onChange={(e) => setPartnerDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
              <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={partnerPaid} onChange={(e) => setPartnerPaid(e.target.checked)} className="accent-emerald-500" /> Já foi pago por ela</label>
              <button type="submit" className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold">Salvar</button>
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
