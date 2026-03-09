"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Menu, ChevronLeft, ChevronRight, Plus, X, Wallet } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SummaryCards from "@/components/SummaryCards";
import Charts from "@/components/Charts";
import TransactionList from "@/components/TransactionList";
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

interface MonthlyData {
  month: number;
  year: number;
  income: number;
  expense: number;
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

export default function DashboardPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);

  // Form da nova transação
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState("expense");
  const [newDescription, setNewDescription] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [s, c, m, t, cats] = await Promise.all([
        api.get(`/reports/summary?month=${month}&year=${year}`),
        api.get(`/reports/by-category?month=${month}&year=${year}`),
        api.get(`/reports/monthly-evolution?year=${year}`),
        api.get(`/transactions?month=${month}&year=${year}&limit=20`),
        api.get("/categories"),
      ]);
      setSummary(s);
      setCategoryData(c);
      setMonthlyData(m);
      setTransactions(t);
      setCategories(cats);
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
      });
      setShowAddModal(false);
      setNewAmount("");
      setNewDescription("");
      setNewCategoryId("");
      setNewType("expense");
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
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-gray-400"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Seletor de mês */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base sm:text-lg font-semibold text-white min-w-[140px] sm:min-w-[180px] text-center">
                  {MONTHS[month - 1]} {year}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSalaryModal(true)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition-all"
                title="Configurar Salário"
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Salário</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-600/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nova Transação</span>
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
          {loading ? (
            <div className="space-y-6">
              {/* Skeleton loading */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-28 rounded-2xl shimmer bg-[#1a1a2e]"
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80 rounded-2xl shimmer bg-[#1a1a2e]" />
                <div className="h-80 rounded-2xl shimmer bg-[#1a1a2e]" />
              </div>
              <div className="h-64 rounded-2xl shimmer bg-[#1a1a2e]" />
            </div>
          ) : (
            <>
              <SummaryCards data={summary} />
              <Charts
                categoryData={categoryData}
                monthlyData={monthlyData}
              />
              <TransactionList
                transactions={transactions}
                onDelete={handleDeleteTransaction}
              />
            </>
          )}
        </div>
      </main>

      {/* Modal: Nova Transação */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Nova Transação
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Tipo */}
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

              {/* Valor */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Valor (R$)
                </label>
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

              {/* Descrição */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  placeholder="Ex: Mercado, Salário..."
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Categoria
                </label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                >
                  <option value="" className="bg-[#1a1a2e]">
                    Selecionar...
                  </option>
                  {categories.map((cat) => (
                    <option
                      key={cat.id}
                      value={cat.id}
                      className="bg-[#1a1a2e]"
                    >
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-600/20"
              >
                Adicionar
              </button>
            </form>
          </div>
        </div>
      )}
      {showSalaryModal && (
        <SalaryModal
          onClose={() => setShowSalaryModal(false)}
          onSaved={() => setShowSalaryModal(false)}
        />
      )}
    </div>
  );
}
