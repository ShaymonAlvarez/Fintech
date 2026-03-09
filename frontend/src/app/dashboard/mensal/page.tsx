"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Menu, ChevronLeft, ChevronRight, Pencil, Check, X, Trash2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface CategoryDetail {
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  budget: number | null;
  percentage_used: number | null;
  status: "none" | "ok" | "warning" | "danger" | "over";
  transaction_count: number;
}

const STATUS_CONFIG = {
  none:    { bar: "#6B7280", bg: "bg-gray-500/10", badge: "",                 label: ""          },
  ok:      { bar: "#22C55E", bg: "bg-emerald-500/10", badge: "text-emerald-400", label: "✓ OK"  },
  warning: { bar: "#F59E0B", bg: "bg-amber-500/10",   badge: "text-amber-400",   label: "⚠ Atenção" },
  danger:  { bar: "#F97316", bg: "bg-orange-500/10",  badge: "text-orange-400",  label: "🔥 Alto"   },
  over:    { bar: "#EF4444", bg: "bg-rose-500/10",    badge: "text-rose-400",    label: "⛔ Excedeu" },
};

function CategoryCard({
  item,
  onSetBudget,
  onRemoveBudget,
}: {
  item: CategoryDetail;
  onSetBudget: (id: number, amount: number) => void;
  onRemoveBudget: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.budget ? String(item.budget) : "");

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);

  const handleSave = () => {
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      onSetBudget(item.category_id, amount);
    }
    setEditing(false);
  };

  const cfg = STATUS_CONFIG[item.status];
  const pct = item.percentage_used;
  const hasTransactions = item.transaction_count > 0;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        hasTransactions
          ? "bg-[#1a1a2e]/80 border-white/8 card-hover"
          : "bg-[#1a1a2e]/30 border-white/4"
      }`}
    >
      <div className="p-4">
        {/* Linha principal */}
        <div className="flex items-center gap-3">
          {/* Ícone */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: `${item.category_color}18` }}
          >
            {item.category_icon}
          </div>

          {/* Nome + gasto */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`font-medium text-sm truncate ${
                  hasTransactions ? "text-white" : "text-gray-600"
                }`}
              >
                {item.category_name}
              </span>
              <span
                className={`font-bold text-base flex-shrink-0 ${
                  item.total > 0 ? "text-white" : "text-gray-700"
                }`}
              >
                {fmt(item.total)}
              </span>
            </div>

            {/* Sub-linha: transações + badge status */}
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs text-gray-600">
                {item.transaction_count > 0
                  ? `${item.transaction_count} transaç${item.transaction_count > 1 ? "ões" : "ão"}`
                  : "Sem transações"}
              </span>
              {pct !== null && (
                <span className={`text-xs font-semibold ${cfg.badge}`}>
                  {cfg.label} — {pct.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Barra de progresso */}
        {item.budget !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-600">Gasto</span>
              <span className="text-gray-500">
                Meta: {fmt(item.budget)}
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(pct ?? 0, 100)}%`,
                  background: cfg.bar,
                  boxShadow: `0 0 8px ${cfg.bar}60`,
                }}
              />
            </div>
            {(pct ?? 0) > 100 && (
              <div
                className="h-1 rounded-full mt-0.5 opacity-50"
                style={{
                  width: `${Math.min(((pct ?? 0) - 100), 50)}%`,
                  background: cfg.bar,
                }}
              />
            )}
          </div>
        )}

        {/* Editar limiar */}
        <div className="mt-3 flex items-center gap-2">
          {editing ? (
            <>
              <span className="text-xs text-gray-500">Meta R$</span>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setEditing(false);
                }}
                autoFocus
                className="flex-1 px-2 py-1 rounded-lg bg-white/5 border border-violet-500/40 text-white text-sm focus:outline-none focus:border-violet-400"
                placeholder="Ex: 500"
              />
              <button
                onClick={handleSave}
                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setValue(item.budget ? String(item.budget) : "");
                  setEditing(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
              >
                <Pencil className="w-3 h-3" />
                {item.budget ? "Editar meta" : "Definir meta"}
              </button>
              {item.budget && (
                <button
                  onClick={() => onRemoveBudget(item.category_id)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-700 hover:text-rose-400 transition-colors"
                  title="Remover meta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MensalPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [details, setDetails] = useState<CategoryDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.get(
        `/reports/monthly-detail?month=${month}&year=${year}`
      );
      setDetails(data);
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
    setLoading(false);
  }, [month, year, router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadData();
  }, [loadData, router]);

  const handleSetBudget = async (categoryId: number, amount: number) => {
    try {
      await api.post("/budgets", { category_id: categoryId, budget_amount: amount });
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleRemoveBudget = async (categoryId: number) => {
    try {
      await api.delete(`/budgets/${categoryId}`);
      loadData();
    } catch (e) { console.error(e); }
  };

  const prevMonth = () => {
    setMonth((m) => { if (m === 1) { setYear((y) => y - 1); return 12; } return m - 1; });
  };
  const nextMonth = () => {
    setMonth((m) => { if (m === 12) { setYear((y) => y + 1); return 1; } return m + 1; });
  };

  // Totais
  const totalGasto = details.filter((d) => d.category_name !== "Renda").reduce((s, d) => s + d.total, 0);
  const totalRenda = details.filter((d) => d.category_name === "Renda").reduce((s, d) => s + d.total, 0);
  const totalMeta = details.reduce((s, d) => s + (d.budget || 0), 0);
  const withBudget = details.filter((d) => d.budget !== null).length;
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Separa categorias com gasto das sem gasto
  const withTransactions = details.filter((d) => d.transaction_count > 0);
  const withoutTransactions = details.filter((d) => d.transaction_count === 0);

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
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base sm:text-lg font-semibold text-white min-w-[160px] text-center">
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
            <h1 className="text-sm font-semibold text-gray-400 hidden sm:block">
              📋 Visão Mensal por Categoria
            </h1>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
          {/* Cards de Resumo do Mês */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Renda", value: fmt(totalRenda), color: "from-emerald-600 to-teal-600", icon: "💰" },
              { label: "Total Gasto", value: fmt(totalGasto), color: "from-rose-600 to-pink-600", icon: "📤" },
              { label: "Saldo", value: fmt(totalRenda - totalGasto), color: totalRenda - totalGasto >= 0 ? "from-violet-600 to-indigo-600" : "from-red-700 to-rose-700", icon: "⚖️" },
              { label: `Metas Definidas`, value: `${withBudget} cats`, color: "from-amber-600 to-orange-600", icon: "🎯", sub: totalMeta > 0 ? fmt(totalMeta) : "" },
            ].map((c) => (
              <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-2xl p-4 shadow-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70 text-xs font-medium">{c.label}</span>
                  <span className="text-lg">{c.icon}</span>
                </div>
                <p className="text-white font-bold text-lg leading-tight">{c.value}</p>
                {c.sub && <p className="text-white/50 text-xs mt-0.5">{c.sub} em metas</p>}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-36 rounded-2xl shimmer bg-[#1a1a2e]" />
              ))}
            </div>
          ) : (
            <>
              {/* Categorias com transações */}
              {withTransactions.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    📊 Com movimentações ({withTransactions.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {withTransactions.map((item) => (
                      <CategoryCard
                        key={item.category_id}
                        item={item}
                        onSetBudget={handleSetBudget}
                        onRemoveBudget={handleRemoveBudget}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Categorias sem transações mas com meta */}
              {withoutTransactions.filter((d) => d.budget !== null).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    🎯 Sem gastos, com meta
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {withoutTransactions
                      .filter((d) => d.budget !== null)
                      .map((item) => (
                        <CategoryCard
                          key={item.category_id}
                          item={item}
                          onSetBudget={handleSetBudget}
                          onRemoveBudget={handleRemoveBudget}
                        />
                      ))}
                  </div>
                </section>
              )}

              {/* Categorias sem nada */}
              {withoutTransactions.filter((d) => d.budget === null).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                    💤 Sem atividade ({withoutTransactions.filter((d) => d.budget === null).length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {withoutTransactions
                      .filter((d) => d.budget === null)
                      .map((item) => (
                        <CategoryCard
                          key={item.category_id}
                          item={item}
                          onSetBudget={handleSetBudget}
                          onRemoveBudget={handleRemoveBudget}
                        />
                      ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
