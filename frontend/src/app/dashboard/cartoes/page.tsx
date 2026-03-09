"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import { CreditCard, Menu, ChevronLeft, ChevronRight, Landmark, Calendar } from "lucide-react";

// ==================== TYPES ====================

interface CardData {
  id: number;
  bank_name: string;
  card_name: string;
  closing_day: number;
  due_day: number;
  color: string;
  icon: string;
  is_active: boolean;
}

interface CardInstallment {
  id: number;
  card_id: number;
  description: string;
  total_amount: number;
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
  bank_name: string | null;
  name: string;
  total_amount: number;
  installment_amount: number;
  total_installments: number;
  paid_installments: number;
  remaining_installments: number;
  due_day: number;
  start_date: string;
}

interface LoanScheduleItem {
  month: number;
  year: number;
  month_name: string;
  installment_number: number;
  amount: number;
  is_paid: boolean;
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function getInstallmentForMonth(inst: CardInstallment, month: number, year: number): number {
  const startDate = new Date(inst.start_date);
  const diff = (year - startDate.getFullYear()) * 12 + (month - (startDate.getMonth() + 1));
  if (diff >= 0 && diff < inst.remaining_installments) return inst.monthly_amount;
  return 0;
}

// ==================== COMPONENT ====================

export default function CartoesPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cards, setCards] = useState<CardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [installments, setInstallments] = useState<CardInstallment[]>([]);
  const [subscriptions, setSubscriptions] = useState<CardSubscription[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanSchedules, setLoanSchedules] = useState<Record<number, LoanScheduleItem[]>>({});
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    try {
      const [cardsData, loansData] = await Promise.all([
        api.get("/cards"),
        api.get("/loans"),
      ]);
      setCards(cardsData);
      setLoans(loansData);
      if (cardsData.length > 0 && !selectedCard) {
        setSelectedCard(cardsData[0].id);
      }

      // Load loan schedules
      try {
        const scheduleData = await api.get("/loans/schedule");
        const schedMap: Record<number, LoanScheduleItem[]> = {};
        for (const item of scheduleData) {
          schedMap[item.loan.id] = item.schedule;
        }
        setLoanSchedules(schedMap);
      } catch { /* endpoint may not exist yet */ }
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
    setLoading(false);
  }, [router, selectedCard]);

  const loadCardDetails = useCallback(async (cardId: number) => {
    try {
      const [inst, subs] = await Promise.all([
        api.get(`/cards/${cardId}/installments`),
        api.get(`/cards/${cardId}/subscriptions`),
      ]);
      setInstallments(inst);
      setSubscriptions(subs);
    } catch (err) {
      console.error("Erro ao carregar detalhes do cartão:", err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadCards();
  }, [loadCards, router]);

  useEffect(() => {
    if (selectedCard) loadCardDetails(selectedCard);
  }, [selectedCard, loadCardDetails]);

  const card = cards.find((c) => c.id === selectedCard) ?? cards[0];

  const monthlyData = useMemo(() => {
    if (!card) return [];
    const activeSubs = subscriptions.filter((s) => s.is_active);
    const subTotal = activeSubs.reduce((s, sub) => s + sub.monthly_amount, 0);
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const fatura = installments.reduce((s, inst) => s + getInstallmentForMonth(inst, m, viewYear), 0);
      return { month: m, label: MONTHS[i], fatura, assinaturas: subTotal, variavel: 0, total: fatura + subTotal };
    });
  }, [card, installments, subscriptions, viewYear]);

  const totalFatura = monthlyData.reduce((s, d) => s + d.fatura, 0);
  const totalAssinaturas = monthlyData.reduce((s, d) => s + d.assinaturas, 0);
  const totalVariavel = monthlyData.reduce((s, d) => s + d.variavel, 0);
  const maxTotal = Math.max(...monthlyData.map((d) => d.total), 1);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-950 text-gray-100 items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

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
            <p className="text-xs text-gray-400">{cards.length} cartões · visão anual</p>
          </div>
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
          {cards.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Nenhum cartão cadastrado</p>
              <p className="text-gray-600 text-xs mt-1">Adicione cartões pelo Telegram ou pela API</p>
            </div>
          ) : (
            <>
              {/* ===== CARD TABS ===== */}
              <div className="flex gap-3 flex-wrap">
                {cards.map((c) => (
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
              {card && (
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

                  <div className="flex gap-4 px-6 py-3 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-purple-400" />Fatura Atual</div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-400" />Assinaturas</div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium w-32">Mês</th>
                          <th className="text-right px-3 py-3 text-xs text-gray-500 font-medium">Fatura</th>
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
                      <tfoot>
                        <tr className="border-t-2 border-gray-700 bg-gray-800/30">
                          <td className="px-4 py-3 text-sm font-bold text-gray-300">TOTAL ANO</td>
                          <td className="text-right px-3 py-3 text-sm font-bold text-purple-300">{fmt(totalFatura)}</td>
                          <td className="text-right px-3 py-3 text-sm font-bold text-emerald-300">{fmt(totalAssinaturas)}</td>
                          <td className="text-right px-4 py-3 text-sm font-bold text-red-400">{fmt(totalFatura + totalAssinaturas)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* ===== ACTIVE INSTALLMENTS ===== */}
              {installments.length > 0 && card && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800">
                    <h3 className="text-base font-bold text-white">Parcelamentos Ativos — {card.bank_name}</h3>
                    <p className="text-xs text-gray-500 mt-1">Compras parceladas em andamento</p>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {installments.map((inst) => {
                      const pct = (inst.paid_installments / inst.total_installments) * 100;
                      const remainingTotal = inst.remaining_installments * inst.monthly_amount;
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
                                  {inst.remaining_installments} restantes
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
              {loans.length > 0 && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-red-400" />
                      Empréstimos Ativos
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Cronograma de parcelas restantes</p>
                  </div>
                  <div className="p-6 space-y-6">
                    {loans.map((loan) => {
                      const schedule = loanSchedules[loan.id] || [];
                      const remainingTotal = loan.remaining_installments * loan.installment_amount;
                      const pct = (loan.paid_installments / loan.total_installments) * 100;
                      return (
                        <div key={loan.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-white">{loan.name}</p>
                              <p className="text-xs text-gray-500">{loan.bank_name || "Banco"} · Vence dia {loan.due_day}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-400">{fmt(loan.installment_amount)}/mês</p>
                              <p className="text-xs text-gray-500">{loan.remaining_installments} parcelas restantes · {fmt(remainingTotal)} total</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 w-12 text-right">
                              {loan.paid_installments}/{loan.total_installments}
                            </span>
                          </div>
                          {schedule.length > 0 && (
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
                                      <p className="font-semibold">{item.month_name}/{item.year}</p>
                                      <p className="text-red-400 font-bold mt-0.5">{fmt(item.amount)}</p>
                                      <p className="text-gray-600 text-xs">Parc. {item.installment_number}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===== SUBSCRIPTIONS ===== */}
              {subscriptions.filter(s => s.is_active).length > 0 && card && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800">
                    <h3 className="text-base font-bold text-white">Assinaturas — {card.bank_name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Total: {fmt(subscriptions.filter((s) => s.is_active).reduce((s, sub) => s + sub.monthly_amount, 0))}/mês
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-6">
                    {subscriptions.map((sub) => (
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
              {cards.length > 1 && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      Resumo Consolidado
                    </h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {cards.map((c) => (
                      <div key={c.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">{c.icon}</span>
                          <div>
                            <p className="text-sm font-bold text-white">{c.bank_name}</p>
                            <p className="text-xs text-gray-500">{c.card_name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
