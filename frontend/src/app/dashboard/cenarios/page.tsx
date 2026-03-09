"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import {
  Sparkles,
  Menu,
  Plus,
  Copy,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Tag,
  Wallet,
  Info,
} from "lucide-react";

// ==================== TYPES ====================

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
  month: number;
  year: number;
  notes: string | null;
  total_estimated: number;
  items: ScenarioItem[];
  created_at: string;
}

// ==================== PRE-DEFINED CATEGORIES ====================

const PRESET_CATEGORIES = [
  { name: "CPTM",        icon: "🚇", default_amount: 12  },
  { name: "UBER",        icon: "🚕", default_amount: 45  },
  { name: "VR/VA",       icon: "🍱", default_amount: 35  },
  { name: "LOJAS",       icon: "🛍️", default_amount: 100 },
  { name: "CINEMA",      icon: "🎬", default_amount: 45  },
  { name: "RESTAURANTE", icon: "🍽️", default_amount: 80  },
  { name: "CAFÉ",        icon: "☕", default_amount: 20  },
  { name: "ATRAÇÕES",    icon: "🎡", default_amount: 60  },
  { name: "STUDIO",      icon: "🎸", default_amount: 100 },
  { name: "MERCADO",     icon: "🛒", default_amount: 80  },
  { name: "FARMÁCIA",    icon: "💊", default_amount: 50  },
  { name: "COMBUSTÍVEL", icon: "⛽", default_amount: 120 },
  { name: "INGRESSO",    icon: "🎟️", default_amount: 80  },
  { name: "BAR",         icon: "🍺", default_amount: 60  },
  { name: "DELIVERY",    icon: "🛵", default_amount: 45  },
  { name: "ESTACIONAMENTO", icon: "🅿️", default_amount: 30 },
];

const ICON_OPTIONS = ["🎯","🎵","🎸","🎭","🏃","✈️","🏖️","🎪","🎉","🤝","🎮","🌟","🏋️","🎨","📸","🎤","🚀","💡"];
const COLOR_OPTIONS = [
  "#6366F1","#8B5CF6","#EC4899","#F43F5E","#EF4444",
  "#F97316","#F59E0B","#10B981","#06B6D4","#3B82F6",
  "#A855F7","#84CC16","#14B8A6","#E11D48","#7C3AED",
];

const MONTHS_PT = ["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ==================== FORM STATE ====================

interface FormItem {
  category_name: string;
  icon: string;
  estimated_amount: string;
}

interface FormState {
  name: string;
  icon: string;
  color: string;
  notes: string;
  items: FormItem[];
  customName: string;
  customIcon: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  icon: "🎯",
  color: "#6366F1",
  notes: "",
  items: [],
  customName: "",
  customIcon: "📦",
};

// ==================== COMPONENT ====================

export default function CenariosPage() {
  const router = useRouter();
  const today = new Date();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<number | null>(null);
  const [duplicateMonth, setDuplicateMonth] = useState(today.getMonth() + 1);
  const [duplicateYear, setDuplicateYear] = useState(today.getFullYear());
  const [addingCustom, setAddingCustom] = useState(false);
  const [expandedScenario, setExpandedScenario] = useState<number | null>(null);
  const [salary, setSalary] = useState(0);
  const [recurringTotal, setRecurringTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadScenarios = useCallback(async () => {
    try {
      const data = await api.get(`/scenarios?month=${viewMonth}&year=${viewYear}`);
      setScenarios(data);
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
    setLoading(false);
  }, [viewMonth, viewYear, router]);

  const loadImpactData = useCallback(async () => {
    try {
      const [salaryData, recurringData] = await Promise.allSettled([
        api.get("/salary/config"),
        api.get("/recurring"),
      ]);
      if (salaryData.status === "fulfilled" && salaryData.value) {
        setSalary(salaryData.value.total_amount || 0);
      }
      if (recurringData.status === "fulfilled" && Array.isArray(recurringData.value)) {
        const total = recurringData.value
          .filter((r: { is_active: boolean }) => r.is_active)
          .reduce((s: number, r: { amount: number }) => s + r.amount, 0);
        setRecurringTotal(total);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setLoading(true);
    loadScenarios();
    loadImpactData();
  }, [loadScenarios, loadImpactData, router]);

  const currentMonthScenarios = scenarios;

  const totalPlanned = currentMonthScenarios.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.estimated_amount, 0), 0
  );

  const projectedBalance = salary - recurringTotal - totalPlanned;

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  // ---- Modal helpers ----

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setAddingCustom(false);
    setModalOpen(true);
  }

  function openEdit(s: Scenario) {
    setForm({
      name: s.name,
      icon: s.icon,
      color: s.color,
      notes: s.notes || "",
      items: s.items.map((i) => ({
        category_name: i.category_name,
        icon: i.icon,
        estimated_amount: String(i.estimated_amount),
      })),
      customName: "",
      customIcon: "📦",
    });
    setEditingId(s.id);
    setAddingCustom(false);
    setModalOpen(true);
  }

  function togglePreset(preset: typeof PRESET_CATEGORIES[number]) {
    const exists = form.items.findIndex((i) => i.category_name === preset.name);
    if (exists >= 0) {
      setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== exists) }));
    } else {
      setForm((f) => ({
        ...f,
        items: [...f.items, { category_name: preset.name, icon: preset.icon, estimated_amount: String(preset.default_amount) }],
      }));
    }
  }

  function updateItemAmount(idx: number, val: string) {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, estimated_amount: val } : item),
    }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function addCustomCategory() {
    if (!form.customName.trim()) return;
    setForm((f) => ({
      ...f,
      items: [...f.items, { category_name: f.customName.toUpperCase(), icon: f.customIcon, estimated_amount: "0" }],
      customName: "",
      customIcon: "📦",
    }));
    setAddingCustom(false);
  }

  async function saveScenario() {
    if (!form.name.trim() || saving) return;
    setSaving(true);

    const items = form.items
      .filter((i) => parseFloat(i.estimated_amount) > 0)
      .map((i) => ({
        category_name: i.category_name,
        icon: i.icon,
        estimated_amount: parseFloat(i.estimated_amount) || 0,
      }));

    try {
      if (editingId !== null) {
        await api.post(`/scenarios/${editingId}`, {
          name: form.name,
          icon: form.icon,
          color: form.color,
          notes: form.notes,
          items,
        }, "PUT");
      } else {
        await api.post("/scenarios", {
          name: form.name,
          icon: form.icon,
          color: form.color,
          month: viewMonth,
          year: viewYear,
          notes: form.notes,
          items,
        });
      }
      await loadScenarios();
      setModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar cenário:", err);
    }
    setSaving(false);
  }

  async function deleteScenario(id: number) {
    try {
      await api.delete(`/scenarios/${id}`);
      await loadScenarios();
    } catch (err) {
      console.error("Erro ao excluir cenário:", err);
    }
    setDeleteConfirm(null);
    if (expandedScenario === id) setExpandedScenario(null);
  }

  async function confirmDuplicate() {
    if (!duplicateTarget) return;
    try {
      await api.post(`/scenarios/${duplicateTarget}/duplicate?month=${duplicateMonth}&year=${duplicateYear}`, {});
      await loadScenarios();
    } catch (err) {
      console.error("Erro ao duplicar cenário:", err);
    }
    setDuplicateTarget(null);
  }

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-950 text-gray-100 items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar overlay mobile */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setSidebarOpen(false)}
        />
        <div className={`absolute left-0 top-0 h-full w-64 bg-gray-900 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <Sidebar />
        </div>
      </div>
      <div className="hidden lg:block w-64 flex-shrink-0"><Sidebar /></div>

      <div className="flex-1 overflow-auto">
        {/* ===== HEADER ===== */}
        <div className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center gap-4">
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Cenários de Gasto</h1>
            <p className="text-xs text-gray-400">Planejamento por evento / situação</p>
          </div>

          <div className="ml-auto flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5">
            <button onClick={prevMonth} className="text-gray-400 hover:text-white transition"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold text-white w-20 text-center">
              {MONTHS_PT[viewMonth]}/{viewYear}
            </span>
            <button onClick={nextMonth} className="text-gray-400 hover:text-white transition"><ChevronRight className="w-4 h-4" /></button>
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Novo Cenário
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ===== SCENARIOS LIST ===== */}
          <div className="xl:col-span-2 space-y-4">
            {currentMonthScenarios.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl p-12 text-center">
                <Sparkles className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Nenhum cenário para {MONTHS_PT[viewMonth]}/{viewYear}</p>
                <p className="text-gray-600 text-xs mt-1">Clique em "Novo Cenário" para planejar um evento</p>
                <button
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-sm px-4 py-2 rounded-lg border border-yellow-500/30 transition"
                >
                  <Plus className="w-4 h-4" /> Criar primeiro cenário
                </button>
              </div>
            ) : (
              currentMonthScenarios.map((s) => {
                const total = s.items.reduce((sum, i) => sum + i.estimated_amount, 0);
                const isExpanded = expandedScenario === s.id;
                return (
                  <div
                    key={s.id}
                    className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden transition hover:border-gray-700"
                    style={{ borderLeftWidth: "3px", borderLeftColor: s.color }}
                  >
                    {/* Card Header */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: `${s.color}22`, border: `1px solid ${s.color}44` }}
                      >
                        {s.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white">{s.name}</h3>
                        {s.notes && <p className="text-xs text-gray-500 truncate">{s.notes}</p>}
                        <p className="text-xs text-gray-600 mt-0.5">{s.items.length} categorias</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold" style={{ color: s.color }}>{fmt(total)}</p>
                        <p className="text-xs text-gray-600">estimado</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => setExpandedScenario(isExpanded ? null : s.id)}
                          className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition"
                          title="Ver detalhes"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDuplicateTarget(s.id); setDuplicateMonth(viewMonth); setDuplicateYear(viewYear); }}
                          className="p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-900/30 transition"
                          title="Duplicar cenário"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="p-2 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-yellow-900/30 transition"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(s.id)}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Category chips */}
                    <div className="px-5 pb-4 flex flex-wrap gap-2">
                      {s.items.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700"
                        >
                          <span>{item.icon}</span>
                          <span className="font-medium">{item.category_name}</span>
                          <span className="text-gray-500">{fmt(item.estimated_amount)}</span>
                        </span>
                      ))}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-gray-800 bg-gray-800/20 px-5 py-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Detalhamento</p>
                        <div className="space-y-2">
                          {s.items.map((item) => {
                            const pct = total > 0 ? (item.estimated_amount / total) * 100 : 0;
                            return (
                              <div key={item.id} className="flex items-center gap-3">
                                <span className="text-sm w-5">{item.icon}</span>
                                <span className="text-sm text-gray-300 w-32 truncate">{item.category_name}</span>
                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                                </div>
                                <span className="text-sm font-medium text-gray-300 w-20 text-right">{fmt(item.estimated_amount)}</span>
                                <span className="text-xs text-gray-600 w-10 text-right">{pct.toFixed(0)}%</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-3 pt-3 border-t border-gray-700 text-sm">
                          <span className="text-gray-400 font-medium">Total estimado</span>
                          <span className="font-bold" style={{ color: s.color }}>{fmt(total)}</span>
                        </div>
                      </div>
                    )}

                    {/* Delete confirm */}
                    {deleteConfirm === s.id && (
                      <div className="border-t border-red-900/50 bg-red-900/20 px-5 py-3 flex items-center justify-between">
                        <span className="text-sm text-red-300">Excluir <strong>{s.name}</strong>?</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteScenario(s.id)}
                            className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            Excluir
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ===== IMPACT PANEL ===== */}
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-yellow-400" />
                <h2 className="text-sm font-bold text-white">Impacto no Mês</h2>
                <span className="text-xs text-gray-600">{MONTHS_PT[viewMonth]}/{viewYear}</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">💰 Salário</span>
                  <span className="text-sm font-bold text-emerald-400">+{fmt(salary)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">🔁 Recorrentes</span>
                  <span className="text-sm font-bold text-red-400">-{fmt(recurringTotal)}</span>
                </div>

                {currentMonthScenarios.length > 0 && (
                  <>
                    <div className="border-t border-gray-800 pt-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        ✨ Cenários ({currentMonthScenarios.length})
                      </p>
                      {currentMonthScenarios.map((s) => {
                        const t = s.items.reduce((sum, i) => sum + i.estimated_amount, 0);
                        return (
                          <div key={s.id} className="flex justify-between items-center py-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{s.icon}</span>
                              <span className="text-sm text-gray-300 truncate max-w-[130px]">{s.name}</span>
                            </div>
                            <span className="text-sm font-medium text-yellow-400">-{fmt(t)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm text-gray-400">Total cenários</span>
                      <span className="text-sm font-bold text-yellow-400">-{fmt(totalPlanned)}</span>
                    </div>
                  </>
                )}

                <div className="border-t-2 border-gray-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-300">Saldo projetado</span>
                    <span className={`text-base font-bold ${projectedBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {projectedBalance >= 0 ? "+" : ""}{fmt(projectedBalance)}
                    </span>
                  </div>
                </div>

                {projectedBalance < 0 && (
                  <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/50 rounded-xl p-3">
                    <Info className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">
                      Atenção! Os cenários planejados deixam o saldo negativo. Considere reduzir estimativas.
                    </p>
                  </div>
                )}

                {projectedBalance > 0 && salary > 0 && projectedBalance < salary * 0.1 && (
                  <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-800/50 rounded-xl p-3">
                    <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">
                      Saldo projetado muito baixo. Menos de 10% do salário restando.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Budget bar */}
            {salary > 0 && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Distribuição do salário</p>
                {(() => {
                  const recPct = Math.min((recurringTotal / salary) * 100, 100);
                  const cenPct = Math.min((totalPlanned / salary) * 100, 100 - recPct);
                  const freePct = Math.max(100 - recPct - cenPct, 0);
                  return (
                    <>
                      <div className="h-5 bg-gray-800 rounded-full overflow-hidden flex mb-3">
                        <div className="h-full bg-red-500 transition-all" style={{ width: `${recPct}%` }} title="Recorrentes" />
                        <div className="h-full bg-yellow-500 transition-all" style={{ width: `${cenPct}%` }} title="Cenários" />
                        <div className="h-full bg-emerald-600 transition-all" style={{ width: `${freePct}%` }} title="Livre" />
                      </div>
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                            <span className="text-gray-400">Recorrentes</span>
                          </div>
                          <span className="text-gray-300">{fmt(recurringTotal)} ({recPct.toFixed(0)}%)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                            <span className="text-gray-400">Cenários</span>
                          </div>
                          <span className="text-gray-300">{fmt(totalPlanned)} ({cenPct.toFixed(0)}%)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                            <span className="text-gray-400">Livre</span>
                          </div>
                          <span className="text-gray-300">{fmt(Math.max(salary - recurringTotal - totalPlanned, 0))} ({freePct.toFixed(0)}%)</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{currentMonthScenarios.length}</p>
                <p className="text-xs text-gray-500 mt-1">Cenários</p>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">
                  {currentMonthScenarios.reduce((s, c) => s + c.items.length, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Categorias</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== CREATE / EDIT MODAL ==================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => setModalOpen(false)} />
          <div className="relative bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">
                {editingId ? "Editar Cenário" : "Novo Cenário de Gasto"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Section 1: Name, Icon, Color */}
              <div className="px-6 py-5 border-b border-gray-800 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <label className="block text-xs text-gray-400 mb-2">Ícone</label>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl cursor-pointer border border-gray-700 bg-gray-800"
                      style={{ backgroundColor: `${form.color}22`, borderColor: `${form.color}66` }}>
                      {form.icon}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2 w-48">
                      {ICON_OPTIONS.map((ic) => (
                        <button key={ic}
                          onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                          className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition ${
                            form.icon === ic ? "bg-gray-600 ring-2 ring-yellow-400" : "bg-gray-800 hover:bg-gray-700"
                          }`}>
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Nome do cenário *</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Ex: Passeio SP, Ensaio de Banda, Jantar Especial..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Cor</label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setForm((f) => ({ ...f, color: c }))}
                            className={`w-6 h-6 rounded-full border-2 transition ${form.color === c ? "border-white scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Observações (opcional)</label>
                      <input
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="Ex: Sábado com amigos, aniversário da Ju..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Categories */}
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-300">Categorias de gasto</p>
                  <span className="text-xs text-gray-500">
                    {form.items.length} selecionadas ·{" "}
                    <span className="text-yellow-400 font-medium">
                      {fmt(form.items.reduce((s, i) => s + (parseFloat(i.estimated_amount) || 0), 0))}
                    </span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {PRESET_CATEGORIES.map((p) => {
                    const selected = form.items.some((i) => i.category_name === p.name);
                    return (
                      <button
                        key={p.name}
                        onClick={() => togglePreset(p)}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                          selected
                            ? "text-black border-yellow-400 bg-yellow-400"
                            : "text-gray-400 border-gray-700 bg-gray-800 hover:border-yellow-500/50 hover:text-yellow-400"
                        }`}
                      >
                        {p.icon} {p.name}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setAddingCustom(true)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-500 transition"
                  >
                    <Plus className="w-3 h-3" /> Personalizada
                  </button>
                </div>

                {addingCustom && (
                  <div className="flex gap-2 mb-4 bg-gray-800 rounded-xl p-3">
                    <input
                      value={form.customIcon}
                      onChange={(e) => setForm((f) => ({ ...f, customIcon: e.target.value }))}
                      placeholder="🎯"
                      className="w-12 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none"
                      maxLength={2}
                    />
                    <input
                      value={form.customName}
                      onChange={(e) => setForm((f) => ({ ...f, customName: e.target.value }))}
                      placeholder="Nome da categoria..."
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                      onKeyDown={(e) => e.key === "Enter" && addCustomCategory()}
                    />
                    <button onClick={addCustomCategory}
                      className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-lg transition">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setAddingCustom(false)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {form.items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-2">Defina o valor estimado para cada categoria:</p>
                    {form.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2.5">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-sm font-medium text-gray-200 flex-1">{item.category_name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.estimated_amount}
                            onChange={(e) => updateItemAmount(idx, e.target.value)}
                            className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-yellow-500"
                          />
                        </div>
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1 text-gray-600 hover:text-red-400 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-700 mt-3">
                      <span className="text-sm text-gray-400">Total estimado</span>
                      <span className="text-base font-bold text-yellow-400">
                        {fmt(form.items.reduce((s, i) => s + (parseFloat(i.estimated_amount) || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}

                {form.items.length === 0 && (
                  <div className="text-center py-6 text-gray-600 text-sm">
                    Selecione as categorias acima que irão compor este cenário
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2.5 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveScenario}
                disabled={!form.name.trim() || form.items.length === 0 || saving}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-semibold text-sm py-2.5 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar Cenário"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DUPLICATE MODAL ==================== */}
      {duplicateTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => setDuplicateTarget(null)} />
          <div className="relative bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Copy className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">Duplicar cenário</h2>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Duplicando: <strong className="text-white">
                {scenarios.find((s) => s.id === duplicateTarget)?.name}
              </strong>
            </p>

            <div className="space-y-3">
              <label className="block text-xs text-gray-400 mb-1">Mês de destino</label>
              <div className="flex gap-3">
                <select
                  value={duplicateMonth}
                  onChange={(e) => setDuplicateMonth(parseInt(e.target.value))}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {MONTHS_PT.slice(1).map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={duplicateYear}
                  onChange={(e) => setDuplicateYear(parseInt(e.target.value))}
                  className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-600">
                Será criada uma cópia com os mesmos valores estimados.
              </p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDuplicateTarget(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2.5 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDuplicate}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" /> Duplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
