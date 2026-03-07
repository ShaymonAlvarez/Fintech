"use client";

import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Check,
  Menu,
  TrendingDown,
  Building2,
} from "lucide-react";

type PaymentType = "pix" | "debit" | "credit" | "bank_transfer";

interface RecurringExpense {
  id: number;
  name: string;
  category_icon: string;
  category_name: string;
  category_color: string;
  amount: number;
  due_day: number;
  bank_name: string | null;
  payment_type: PaymentType;
  is_active: boolean;
}

const PAYMENT_CONFIG: Record<PaymentType, { label: string; bg: string; text: string; dot: string }> = {
  pix:           { label: "PIX",            bg: "bg-green-900/40",  text: "text-green-300",  dot: "bg-green-400"  },
  debit:         { label: "Débito",         bg: "bg-blue-900/40",   text: "text-blue-300",   dot: "bg-blue-400"   },
  credit:        { label: "Crédito",        bg: "bg-purple-900/40", text: "text-purple-300", dot: "bg-purple-400" },
  bank_transfer: { label: "Ted/Doc",        bg: "bg-amber-900/40",  text: "text-amber-300",  dot: "bg-amber-400"  },
};

const CATEGORIES = [
  { icon: "💳", name: "Cartões Gastos",  color: "#6366F1" },
  { icon: "🏦", name: "Empréstimos",     color: "#DC2626" },
  { icon: "📈", name: "Investimentos",   color: "#10B981" },
  { icon: "🚕", name: "Uber/99/Taxi",    color: "#F59E0B" },
  { icon: "🍽️", name: "Restaurante",     color: "#EF4444" },
  { icon: "🛒", name: "Mercados/Feiras", color: "#84CC16" },
  { icon: "🛵", name: "iFood",           color: "#FF6900" },
  { icon: "🤝", name: "Ajudas em Geral", color: "#A855F7" },
  { icon: "🎁", name: "Presentes",       color: "#EC4899" },
  { icon: "🎮", name: "Lazer",           color: "#06B6D4" },
  { icon: "💊", name: "Saúde",           color: "#16A34A" },
  { icon: "🚇", name: "CPTM",            color: "#3B82F6" },
  { icon: "🎯", name: "Itens de Lazer",  color: "#8B5CF6" },
  { icon: "📦", name: "E-Commerce",      color: "#F97316" },
  { icon: "💰", name: "Renda",           color: "#22C55E" },
  { icon: "❤️",  name: "Ajuda",           color: "#F43F5E" },
  { icon: "🏠", name: "Moradia",         color: "#8B5CF6" },
  { icon: "📡", name: "Internet/Celular",color: "#3B82F6" },
];

const DEMO_EXPENSES: RecurringExpense[] = [
  { id: 1,  name: "Aluguel",             category_icon: "🏠", category_name: "Moradia",          category_color: "#8B5CF6", amount: 1200, due_day: 5,  bank_name: "Nubank",     payment_type: "pix",           is_active: true  },
  { id: 2,  name: "Condomínio",          category_icon: "🏠", category_name: "Moradia",          category_color: "#8B5CF6", amount: 600,  due_day: 5,  bank_name: "Itaú",       payment_type: "bank_transfer", is_active: true  },
  { id: 3,  name: "Plano de Saúde",      category_icon: "💊", category_name: "Saúde",            category_color: "#16A34A", amount: 350,  due_day: 5,  bank_name: "Bradesco",   payment_type: "bank_transfer", is_active: true  },
  { id: 4,  name: "Internet Fibra",      category_icon: "📡", category_name: "Internet/Celular", category_color: "#3B82F6", amount: 120,  due_day: 10, bank_name: null,         payment_type: "debit",         is_active: true  },
  { id: 5,  name: "Celular",             category_icon: "📡", category_name: "Internet/Celular", category_color: "#3B82F6", amount: 80,   due_day: 10, bank_name: null,         payment_type: "debit",         is_active: true  },
  { id: 6,  name: "Academia",            category_icon: "💊", category_name: "Saúde",            category_color: "#16A34A", amount: 99,   due_day: 1,  bank_name: "Inter",      payment_type: "debit",         is_active: true  },
  { id: 7,  name: "Spotify",             category_icon: "🎮", category_name: "Lazer",            category_color: "#06B6D4", amount: 22,   due_day: 15, bank_name: "Nubank",     payment_type: "credit",        is_active: true  },
  { id: 8,  name: "Netflix",             category_icon: "🎮", category_name: "Lazer",            category_color: "#06B6D4", amount: 40,   due_day: 20, bank_name: "Nubank",     payment_type: "credit",        is_active: true  },
  { id: 9,  name: "Prime Video",         category_icon: "🎮", category_name: "Lazer",            category_color: "#06B6D4", amount: 19,   due_day: 20, bank_name: "Nubank",     payment_type: "credit",        is_active: true  },
  { id: 10, name: "Luz / Energia",       category_icon: "🏠", category_name: "Moradia",          category_color: "#8B5CF6", amount: 150,  due_day: 12, bank_name: null,         payment_type: "pix",           is_active: true  },
  { id: 11, name: "Água",                category_icon: "🏠", category_name: "Moradia",          category_color: "#8B5CF6", amount: 60,   due_day: 18, bank_name: null,         payment_type: "pix",           is_active: true  },
  { id: 12, name: "Parcela Empréstimo",  category_icon: "🏦", category_name: "Empréstimos",      category_color: "#DC2626", amount: 800,  due_day: 5,  bank_name: "Caixa",      payment_type: "bank_transfer", is_active: true  },
  { id: 13, name: "Cartão CPTM Mensal",  category_icon: "🚇", category_name: "CPTM",             category_color: "#3B82F6", amount: 120,  due_day: 1,  bank_name: null,         payment_type: "debit",         is_active: true  },
  { id: 14, name: "Seguro Auto",         category_icon: "🚕", category_name: "Uber/99/Taxi",     category_color: "#F59E0B", amount: 180,  due_day: 15, bank_name: null,         payment_type: "bank_transfer", is_active: false },
];

const EMPTY_FORM = {
  name: "",
  category_icon: "📦",
  category_name: "Moradia",
  category_color: "#8B5CF6",
  amount: "",
  due_day: "5",
  bank_name: "",
  payment_type: "pix" as PaymentType,
  is_active: true,
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RecorrentesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expenses, setExpenses] = useState<RecurringExpense[]>(DEMO_EXPENSES);
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const visible = showInactive ? expenses : expenses.filter((e) => e.is_active);
  const active = expenses.filter((e) => e.is_active);

  // Bank summary: group by bank_name OR payment_type
  const bankGroups = useMemo(() => {
    const PAYMENT_LABELS: Record<PaymentType, string> = {
      pix: "PIX",
      debit: "Débito",
      credit: "Crédito",
      bank_transfer: "Ted/Doc",
    };
    const map = new Map<string, { key: string; type: "bank" | "pay"; total: number; count: number; exps: RecurringExpense[] }>();
    for (const e of active) {
      const key = e.bank_name || PAYMENT_LABELS[e.payment_type];
      const type = e.bank_name ? "bank" : "pay";
      if (!map.has(key)) map.set(key, { key, type, total: 0, count: 0, exps: [] });
      const g = map.get(key)!;
      g.total += e.amount;
      g.count += 1;
      g.exps.push(e);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [active]);

  const totalMonthly = active.reduce((s, e) => s + e.amount, 0);

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(e: RecurringExpense) {
    setForm({
      name: e.name,
      category_icon: e.category_icon,
      category_name: e.category_name,
      category_color: e.category_color,
      amount: String(e.amount),
      due_day: String(e.due_day),
      bank_name: e.bank_name || "",
      payment_type: e.payment_type,
      is_active: e.is_active,
    });
    setEditingId(e.id);
    setModalOpen(true);
  }

  function saveForm() {
    if (!form.name || !form.amount) return;
    const cat = CATEGORIES.find((c) => c.name === form.category_name) ?? CATEGORIES[0];
    const data: RecurringExpense = {
      id: editingId ?? Date.now(),
      name: form.name,
      category_icon: cat.icon,
      category_name: cat.name,
      category_color: cat.color,
      amount: parseFloat(form.amount),
      due_day: parseInt(form.due_day),
      bank_name: form.bank_name || null,
      payment_type: form.payment_type,
      is_active: form.is_active,
    };
    if (editingId !== null) {
      setExpenses((prev) => prev.map((e) => (e.id === editingId ? data : e)));
    } else {
      setExpenses((prev) => [...prev, data]);
    }
    setModalOpen(false);
  }

  function deleteExpense(id: number) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setDeleteConfirm(null);
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
      <div className="hidden lg:block w-64 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center gap-4">
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <RefreshCw className="w-5 h-5 text-emerald-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Gastos Recorrentes</h1>
            <p className="text-xs text-gray-400">{active.length} ativos · {fmt(totalMonthly)}/mês</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
                className="accent-emerald-500" />
              Mostrar inativos
            </label>
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg transition">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* ======== EXPENSE TABLE ======== */}
          <div className="xl:col-span-3 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Lista de Gastos</h2>
              <span className="text-xs text-gray-500">{visible.length} itens</span>
            </div>

            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 text-xs text-gray-500 uppercase tracking-wider mb-1">
              <div className="col-span-4">Nome / Categoria</div>
              <div className="col-span-2 text-center">Vence</div>
              <div className="col-span-2">Forma</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>

            <div className="space-y-2">
              {visible.map((exp) => {
                const pc = PAYMENT_CONFIG[exp.payment_type];
                return (
                  <div key={exp.id}
                    className={`bg-gray-900 rounded-xl border transition ${
                      exp.is_active ? "border-gray-800 hover:border-gray-700" : "border-gray-800/50 opacity-50"
                    }`}>
                    <div className="grid grid-cols-12 gap-2 items-center px-4 py-3">
                      {/* Name + category */}
                      <div className="col-span-12 sm:col-span-4 flex items-center gap-3 min-w-0">
                        <span className="text-lg leading-none">{exp.category_icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{exp.name}</p>
                          <p className="text-xs text-gray-500 truncate">{exp.category_name}</p>
                        </div>
                      </div>
                      {/* Due day */}
                      <div className="col-span-4 sm:col-span-2 text-center">
                        <span className="inline-block bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-md">
                          Dia {exp.due_day}
                        </span>
                      </div>
                      {/* Payment type + bank */}
                      <div className="col-span-4 sm:col-span-2 flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                          {pc.label}
                        </span>
                        {exp.bank_name && (
                          <span className="text-xs text-gray-500 truncate">{exp.bank_name}</span>
                        )}
                      </div>
                      {/* Amount */}
                      <div className="col-span-4 sm:col-span-2 text-right">
                        <span className="text-sm font-bold text-red-400">{fmt(exp.amount)}</span>
                      </div>
                      {/* Actions */}
                      <div className="col-span-12 sm:col-span-2 flex justify-end gap-2">
                        <button onClick={() => openEdit(exp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 transition">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(exp.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/30 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* Delete confirm bar */}
                    {deleteConfirm === exp.id && (
                      <div className="border-t border-red-900/50 px-4 py-2 flex items-center justify-between bg-red-900/20 rounded-b-xl">
                        <span className="text-xs text-red-300">Confirmar exclusão?</span>
                        <div className="flex gap-2">
                          <button onClick={() => deleteExpense(exp.id)}
                            className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-md transition">
                            Excluir
                          </button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md transition">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total row */}
            <div className="bg-gray-900/50 rounded-xl border border-emerald-800/50 px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-300">Total Mensal Recorrente</span>
              <span className="text-lg font-bold text-red-400">{fmt(totalMonthly)}</span>
            </div>
          </div>

          {/* ======== BANK SUMMARY ======== */}
          <div className="xl:col-span-2 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Por Banco / Forma</h2>
            </div>

            <div className="space-y-3">
              {bankGroups.map((g) => (
                <div key={g.key} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{g.type === "bank" ? "🏦" : "💳"}</span>
                      <span className="text-sm font-semibold text-white">{g.key}</span>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                        {g.count} {g.count === 1 ? "item" : "itens"}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-red-400">{fmt(g.total)}</span>
                  </div>
                  {/* Items in this group */}
                  <div className="divide-y divide-gray-800/50">
                    {g.exps.map((exp: RecurringExpense) => (
                      <div key={exp.id} className="flex justify-between items-center px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{exp.category_icon}</span>
                          <div>
                            <p className="text-xs text-gray-300">{exp.name}</p>
                            <p className="text-xs text-gray-600">Dia {exp.due_day}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-400">{fmt(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Breakdown by payment type */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mt-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5" /> Breakdown por Forma
              </h3>
              {(["pix", "debit", "credit", "bank_transfer"] as PaymentType[]).map((pt) => {
                const items = active.filter((e) => e.payment_type === pt);
                if (items.length === 0) return null;
                const total = items.reduce((s, e) => s + e.amount, 0);
                const pc = PAYMENT_CONFIG[pt];
                const pct = totalMonthly > 0 ? (total / totalMonthly) * 100 : 0;
                return (
                  <div key={pt} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`${pc.text} font-medium`}>{pc.label}</span>
                      <span className="text-gray-400">{fmt(total)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${pc.dot} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ======== ADD/EDIT MODAL ======== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />
          <div className="relative bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">
                {editingId ? "Editar Gasto" : "Novo Gasto Recorrente"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Aluguel, Netflix, Academia..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500" />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Categoria</label>
                <select value={form.category_name}
                  onChange={(e) => {
                    const cat = CATEGORIES.find((c) => c.name === e.target.value) ?? CATEGORIES[0];
                    setForm({ ...form, category_name: cat.name, category_icon: cat.icon, category_color: cat.color });
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  {CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Amount + Due Day */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Valor (R$)</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0,00" min="0" step="0.01"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Dia de Vencimento</label>
                  <select value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>Dia {d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment type */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(PAYMENT_CONFIG) as [PaymentType, typeof PAYMENT_CONFIG[PaymentType]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => setForm({ ...form, payment_type: key })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                        form.payment_type === key
                          ? `${cfg.bg} ${cfg.text} border-current`
                          : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600"
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Banco (opcional)</label>
                <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  list="bank-list" placeholder="Nubank, Inter, Itaú, Caixa..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500" />
                <datalist id="bank-list">
                  {["Nubank", "Inter", "Itaú", "Bradesco", "Caixa", "Santander", "BTG", "C6 Bank"].map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-600 mt-1">Deixe em branco para agrupar pela forma de pagamento</p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-300">Gasto ativo</span>
                <button onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`w-12 h-6 rounded-full transition relative ${form.is_active ? "bg-emerald-600" : "bg-gray-600"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2.5 rounded-lg transition">
                Cancelar
              </button>
              <button onClick={saveForm}
                disabled={!form.name || !form.amount}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm py-2.5 rounded-lg transition flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                {editingId ? "Salvar alterações" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
