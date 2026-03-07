"use client";

import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { CreditCard, Menu, ChevronLeft, ChevronRight, Plus, X, Check, Landmark, Calendar } from "lucide-react";

// ==================== TYPES ====================

interface CardInstallment {
  id: number;
  card_id: number;
  description: string;
  total_amount: number;
  monthly_amount: number;
  total_installments: number;
  paid_installments: number;
  start_year: number;
  start_month: number;
}

interface CardSubscription {
  id: number;
  card_id: number;
  description: string;
  monthly_amount: number;
  is_active: boolean;
}

interface CardVariableEntry {
  id: number;
  card_id: number;
  month: number;
  year: number;
  description: string;
  amount: number;
}

interface CardData {
  id: number;
  bank_name: string;
  card_name: string;
  closing_day: number;
  due_day: number;
  color: string;
  icon: string;
  installments: CardInstallment[];
  subscriptions: CardSubscription[];
  variable: CardVariableEntry[];
}

interface Loan {
  id: number;
  bank_name: string;
  name: string;
  total_amount: number;
  installment_amount: number;
  total_installments: number;
  paid_installments: number;
  due_day: number;
  start_year: number;
  start_month: number;
}

// ==================== DEMO DATA ====================

const DEMO_CARDS: CardData[] = [
  {
    id: 1, bank_name: "Nubank", card_name: "Roxinho", closing_day: 19, due_day: 26, color: "#8B5CF6", icon: "💜",
    installments: [
      { id: 1, card_id: 1, description: "Notebook Dell", total_amount: 4800, monthly_amount: 400, total_installments: 12, paid_installments: 4, start_year: 2025, start_month: 1 },
      { id: 2, card_id: 1, description: "Fone AirPods", total_amount: 1500, monthly_amount: 150, total_installments: 10, paid_installments: 2, start_year: 2025, start_month: 3 },
      { id: 3, card_id: 1, description: "Smart TV 55\"", total_amount: 3200, monthly_amount: 267, total_installments: 12, paid_installments: 1, start_year: 2025, start_month: 4 },
    ],
    subscriptions: [
      { id: 1, card_id: 1, description: "Spotify", monthly_amount: 22, is_active: true },
      { id: 2, card_id: 1, description: "Netflix", monthly_amount: 40, is_active: true },
      { id: 3, card_id: 1, description: "Prime Video", monthly_amount: 19, is_active: true },
      { id: 4, card_id: 1, description: "ChatGPT Plus", monthly_amount: 105, is_active: true },
    ],
    variable: [
      { id: 1, card_id: 1, month: 5, year: 2025, description: "Restaurante", amount: 150 },
      { id: 2, card_id: 1, month: 5, year: 2025, description: "Compras variadas", amount: 320 },
    ],
  },
  {
    id: 2, bank_name: "Inter", card_name: "Black", closing_day: 10, due_day: 17, color: "#F97316", icon: "🟠",
    installments: [
      { id: 4, card_id: 2, description: "Geladeira Brastemp", total_amount: 3600, monthly_amount: 300, total_installments: 12, paid_installments: 3, start_year: 2025, start_month: 2 },
      { id: 5, card_id: 2, description: "Ar Condicionado", total_amount: 2400, monthly_amount: 200, total_installments: 12, paid_installments: 0, start_year: 2025, start_month: 5 },
    ],
    subscriptions: [
      { id: 5, card_id: 2, description: "YouTube Premium", monthly_amount: 28, is_active: true },
      { id: 6, card_id: 2, description: "Adobe CC", monthly_amount: 95, is_active: true },
    ],
    variable: [
      { id: 3, card_id: 2, month: 5, year: 2025, description: "Mercado Extra", amount: 280 },
    ],
  },
  {
    id: 3, bank_name: "Itaú", card_name: "Platinum", closing_day: 25, due_day: 2, color: "#F59E0B", icon: "🟡",
    installments: [
      { id: 6, card_id: 3, description: "iPhone 15", total_amount: 7200, monthly_amount: 600, total_installments: 12, paid_installments: 5, start_year: 2024, start_month: 12 },
    ],
    subscriptions: [],
    variable: [
      { id: 4, card_id: 3, month: 5, year: 2025, description: "Farmácia", amount: 95 },
      { id: 5, card_id: 3, month: 5, year: 2025, description: "Gasolina", amount: 180 },
    ],
  },
];

const DEMO_LOANS: Loan[] = [
  { id: 1, bank_name: "Caixa Econômica", name: "Empréstimo Pessoal", total_amount: 12000, installment_amount: 800, total_installments: 18, paid_installments: 6, due_day: 5, start_year: 2025, start_month: 1 },
  { id: 2, bank_name: "Nubank", name: "Crédito Pessoal", total_amount: 3000, installment_amount: 375, total_installments: 8, paid_installments: 2, due_day: 15, start_year: 2025, start_month: 4 },
];

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function getInstallmentForMonth(inst: CardInstallment, month: number, year: number): number {
  const diff = (year - inst.start_year) * 12 + (month - inst.start_month);
  const remaining = inst.total_installments - inst.paid_installments;
  if (diff >= 0 && diff < remaining) return inst.monthly_amount;
  return 0;
}

function getVariableForMonth(entries: CardVariableEntry[], month: number, year: number): number {
  return entries.filter((e) => e.month === month && e.year === year).reduce((s, e) => s + e.amount, 0);
}

// ==================== LOAN SCHEDULE ====================

function getLoanSchedule(loan: Loan, fromYear: number = new Date().getFullYear(), monthCount: number = 12) {
  const result: { month: number; year: number; label: string; installment_number: number; amount: number }[] = [];
  let remaining = loan.total_installments - loan.paid_installments;
  let sm = loan.start_month + loan.paid_installments;
  let sy = loan.start_year;
  while (sm > 12) { sm -= 12; sy++; }

  for (let i = 0; i < remaining; i++) {
    let m = sm + i;
    let y = sy;
    while (m > 12) { m -= 12; y++; }
    result.push({
      month: m, year: y,
      label: `${MONTHS[m - 1]}/${y}`,
      installment_number: loan.paid_installments + i + 1,
      amount: loan.installment_amount,
    });
  }
  return result;
}

// ==================== COMPONENT ====================

export default function CartoesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(DEMO_CARDS[0].id);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [showLoanModal, setShowLoanModal] = useState(false);

  const card = DEMO_CARDS.find((c) => c.id === selectedCard) ?? DEMO_CARDS[0];

  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const fatura = card.installments.reduce((s, inst) => s + getInstallmentForMonth(inst, m, viewYear), 0);
      const assinaturas = card.subscriptions.filter((s) => s.is_active).reduce((s, sub) => s + sub.monthly_amount, 0);
      const variavel = getVariableForMonth(card.variable, m, viewYear);
      return { month: m, label: MONTHS[i], fatura, assinaturas, variavel, total: fatura + assinaturas + variavel };
    });
  }, [card, viewYear]);

  const totalFatura = monthlyData.reduce((s, d) => s + d.fatura, 0);
  const totalAssinaturas = monthlyData.reduce((s, d) => s + d.assinaturas, 0);
  const totalVariavel = monthlyData.reduce((s, d) => s + d.variavel, 0);

  const maxTotal = Math.max(...monthlyData.map((d) => d.total), 1);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar overlay */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? "" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-black/60 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setSidebarOpen(false)} />
        <div className={`absolute left-0 top-0 h-full w-64 bg-gray-900 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <Sidebar />
        </div>
      </div>
      <div className="hidden lg:block w-64 flex-shrink-0"><Sidebar /></div>

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center gap-4">
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <CreditCard className="w-5 h-5 text-purple-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Cartões de Crédito</h1>
            <p className="text-xs text-gray-400">{DEMO_CARDS.length} cartões · visão anual</p>
          </div>
          {/* Year picker */}
          <div className="ml-auto flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5">
            <button onClick={() => setViewYear((y) => y - 1)} className="text-gray-400 hover:text-white transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-white w-12 text-center">{viewYear}</span>
            <button onClick={() => setViewYear((y) => y + 1)} className="text-gray-400 hover:text-white transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* ===== CARD TABS ===== */}
          <div className="flex gap-3 flex-wrap">
            {DEMO_CARDS.map((c) => (
              <button key={c.id} onClick={() => setSelectedCard(c.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
                  selectedCard === c.id
                    ? "border-current text-white"
                    : "border-gray-800 text-gray-400 hover:border-gray-700"
                }`}
                style={selectedCard === c.id ? { borderColor: c.color, backgroundColor: `${c.color}22` } : {}}>
                <span className="text-xl">{c.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-semibold leading-none">{c.bank_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.card_name} · fecha dia {c.closing_day}</p>
                </div>
              </button>
            ))}
          </div>

          {/* ===== MONTHLY TABLE ===== */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span style={{ color: card.color }}>{card.icon}</span>
                  {card.bank_name} · {card.card_name}
                </h2>
                <p className="text-xs text-gray-500 mt-1">Fatura fecha dia {card.closing_day} · Vence dia {card.due_day}</p>
              </div>
              <div className="text-right text-xs text-gray-500 space-y-1">
                <p>Total ano: <span className="font-bold text-red-400">{fmt(totalFatura + totalAssinaturas + totalVariavel)}</span></p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 px-6 py-3 border-b border-gray-800 bg-gray-900/50">
              <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-purple-400" />Fatura Atual</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-blue-400" />Gastos Variáveis</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-400" />Assinaturas</div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium w-32">Mês</th>
                    <th className="text-right px-3 py-3 text-xs text-gray-500 font-medium">Fatura</th>
                    <th className="text-right px-3 py-3 text-xs text-gray-500 font-medium">Variável</th>
                    <th className="text-right px-3 py-3 text-xs text-gray-500 font-medium">Assinaturas</th>
                    <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Total Mês</th>
                    <th className="px-4 py-3 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((d) => {
                    const isCurrent = d.month === currentMonth && viewYear === currentYear;
                    const barPct = (d.total / maxTotal) * 100;
                    return (
                      <tr key={d.month}
                        className={`border-b border-gray-800/50 transition hover:bg-gray-800/30 ${isCurrent ? "bg-purple-900/10" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-200">{d.label}</span>
                            {isCurrent && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Atual</span>}
                          </div>
                        </td>
                        <td className="text-right px-3 py-3">
                          <span className={`text-sm ${d.fatura > 0 ? "text-purple-300 font-medium" : "text-gray-600"}`}>
                            {d.fatura > 0 ? fmt(d.fatura) : "—"}
                          </span>
                        </td>
                        <td className="text-right px-3 py-3">
                          <span className={`text-sm ${d.variavel > 0 ? "text-blue-300 font-medium" : "text-gray-600"}`}>
                            {d.variavel > 0 ? fmt(d.variavel) : "—"}
                          </span>
                        </td>
                        <td className="text-right px-3 py-3">
                          <span className={`text-sm ${d.assinaturas > 0 ? "text-emerald-300 font-medium" : "text-gray-600"}`}>
                            {d.assinaturas > 0 ? fmt(d.assinaturas) : "—"}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className={`text-sm font-bold ${d.total > 0 ? "text-red-400" : "text-gray-600"}`}>
                            {d.total > 0 ? fmt(d.total) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {d.total > 0 && (
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden w-20">
                              <div className="h-full rounded-full"
                                style={{
                                  width: `${barPct}%`,
                                  background: `linear-gradient(90deg, ${card.color}aa, ${card.color})`,
                                }} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals footer */}
                <tfoot>
                  <tr className="border-t-2 border-gray-700 bg-gray-800/30">
                    <td className="px-4 py-3 text-sm font-bold text-gray-300">TOTAL ANO</td>
                    <td className="text-right px-3 py-3 text-sm font-bold text-purple-300">{fmt(totalFatura)}</td>
                    <td className="text-right px-3 py-3 text-sm font-bold text-blue-300">{fmt(totalVariavel)}</td>
                    <td className="text-right px-3 py-3 text-sm font-bold text-emerald-300">{fmt(totalAssinaturas)}</td>
                    <td className="text-right px-4 py-3 text-sm font-bold text-red-400">{fmt(totalFatura + totalVariavel + totalAssinaturas)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ===== ACTIVE INSTALLMENTS ===== */}
          {card.installments.length > 0 && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-base font-bold text-white">Parcelamentos Ativos — {card.bank_name}</h3>
                <p className="text-xs text-gray-500 mt-1">Compras parceladas em andamento</p>
              </div>
              <div className="divide-y divide-gray-800">
                {card.installments.map((inst) => {
                  const remaining = inst.total_installments - inst.paid_installments;
                  const pct = (inst.paid_installments / inst.total_installments) * 100;
                  const remainingTotal = remaining * inst.monthly_amount;
                  return (
                    <div key={inst.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-semibold text-white">{inst.description}</p>
                            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                              {inst.paid_installments}/{inst.total_installments}x
                            </span>
                            <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full">
                              {remaining} restantes
                            </span>
                          </div>
                          <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden w-full max-w-xs">
                            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-purple-300">{fmt(inst.monthly_amount)}/mês</p>
                          <p className="text-xs text-gray-500">Falta {fmt(remainingTotal)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== LOANS SECTION ===== */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-red-400" />
                  Empréstimos Ativos
                </h3>
                <p className="text-xs text-gray-500 mt-1">Cronograma de parcelas restantes</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {DEMO_LOANS.map((loan) => {
                const schedule = getLoanSchedule(loan, currentYear);
                const remaining = loan.total_installments - loan.paid_installments;
                const remainingTotal = remaining * loan.installment_amount;
                const pct = (loan.paid_installments / loan.total_installments) * 100;

                return (
                  <div key={loan.id} className="space-y-3">
                    {/* Loan header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{loan.name}</p>
                        <p className="text-xs text-gray-500">{loan.bank_name} · Vence dia {loan.due_day}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-400">{fmt(loan.installment_amount)}/mês</p>
                        <p className="text-xs text-gray-500">{remaining} parcelas restantes · {fmt(remainingTotal)} total</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right">
                        {loan.paid_installments}/{loan.total_installments}
                      </span>
                    </div>

                    {/* Schedule scrollable */}
                    <div className="overflow-x-auto">
                      <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
                        {schedule.map((item, i) => {
                          const isCurrentMonth = item.month === currentMonth && item.year === currentYear;
                          return (
                            <div key={i}
                              className={`flex-shrink-0 text-center px-3 py-2 rounded-xl border text-xs transition ${
                                isCurrentMonth
                                  ? "bg-red-900/30 border-red-600 text-red-300"
                                  : "bg-gray-800 border-gray-700 text-gray-400"
                              }`}
                              style={{ minWidth: "72px" }}>
                              <p className="font-semibold">{item.label}</p>
                              <p className="text-red-400 font-bold mt-0.5">{fmt(item.amount)}</p>
                              <p className="text-gray-600 text-xs">Parc. {item.installment_number}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== SUBSCRIPTIONS ===== */}
          {card.subscriptions.length > 0 && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-base font-bold text-white">Assinaturas — {card.bank_name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Total: {fmt(card.subscriptions.filter((s) => s.is_active).reduce((s, sub) => s + sub.monthly_amount, 0))}/mês
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-6">
                {card.subscriptions.map((sub) => (
                  <div key={sub.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    sub.is_active ? "bg-gray-800 border-gray-700" : "bg-gray-900 border-gray-800 opacity-50"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${sub.is_active ? "bg-emerald-400" : "bg-gray-600"}`} />
                      <span className="text-sm text-gray-200">{sub.description}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-300">{fmt(sub.monthly_amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== ALL CARDS SUMMARY ===== */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Resumo Consolidado — Mês Atual
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {DEMO_CARDS.map((c) => {
                const fatura = c.installments.reduce((s, inst) => s + getInstallmentForMonth(inst, currentMonth, currentYear), 0);
                const assinaturas = c.subscriptions.filter((s) => s.is_active).reduce((s, sub) => s + sub.monthly_amount, 0);
                const variavel = getVariableForMonth(c.variable, currentMonth, currentYear);
                const total = fatura + assinaturas + variavel;
                return (
                  <div key={c.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{c.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-white">{c.bank_name}</p>
                        <p className="text-xs text-gray-500">{c.card_name}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Parcelamentos</span>
                        <span className="text-purple-300">{fmt(fatura)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Variáveis</span>
                        <span className="text-blue-300">{fmt(variavel)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Assinaturas</span>
                        <span className="text-emerald-300">{fmt(assinaturas)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-1.5 border-t border-gray-700 mt-1.5">
                        <span className="font-semibold text-gray-300">Total</span>
                        <span className="font-bold text-red-400">{fmt(total)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
