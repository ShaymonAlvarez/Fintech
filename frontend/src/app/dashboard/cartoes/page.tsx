"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import {
  CreditCard,
  Menu,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Pencil,
  Check,
  X,
} from "lucide-react";

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

interface CardMonthRow {
  month: number;
  label: string;
  fatura: number;
  variavel: number;
  assinaturas: number;
  total: number;
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getInstallmentForMonth(inst: CardInstallment, month: number, year: number) {
  const startDate = new Date(inst.start_date);
  const diff = (year - startDate.getFullYear()) * 12 + (month - (startDate.getMonth() + 1));
  if (diff >= 0 && diff < inst.remaining_installments) return inst.monthly_amount;
  return 0;
}

export default function CartoesPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cards, setCards] = useState<CardData[]>([]);
  const [installmentsByCard, setInstallmentsByCard] = useState<Record<number, CardInstallment[]>>({});
  const [subscriptionsByCard, setSubscriptionsByCard] = useState<Record<number, CardSubscription[]>>({});
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanSchedules, setLoanSchedules] = useState<Record<number, LoanScheduleItem[]>>({});
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [cardLimits, setCardLimits] = useState<Record<string, number>>({});
  const [editingLimitId, setEditingLimitId] = useState<number | null>(null);
  const [limitInput, setLimitInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("cards-credit-limits");
    if (saved) {
      try {
        setCardLimits(JSON.parse(saved));
      } catch {
        setCardLimits({});
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cards-credit-limits", JSON.stringify(cardLimits));
  }, [cardLimits]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cardsData, loansData, scheduleData] = await Promise.all([
        api.get("/cards"),
        api.get("/loans"),
        api.get("/loans/schedule").catch(() => []),
      ]);

      const installmentMap: Record<number, CardInstallment[]> = {};
      const subscriptionMap: Record<number, CardSubscription[]> = {};

      await Promise.all(
        (cardsData as CardData[]).map(async (card) => {
          const [installments, subscriptions] = await Promise.all([
            api.get(`/cards/${card.id}/installments`).catch(() => []),
            api.get(`/cards/${card.id}/subscriptions`).catch(() => []),
          ]);
          installmentMap[card.id] = installments;
          subscriptionMap[card.id] = subscriptions;
        })
      );

      const scheduleMap: Record<number, LoanScheduleItem[]> = {};
      (scheduleData as Array<{ loan: Loan; schedule: LoanScheduleItem[] }>).forEach((item) => {
        scheduleMap[item.loan.id] = item.schedule;
      });

      setCards(cardsData);
      setInstallmentsByCard(installmentMap);
      setSubscriptionsByCard(subscriptionMap);
      setLoans(loansData);
      setLoanSchedules(scheduleMap);
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadData();
  }, [loadData, router]);

  const cardMonthlyRows = useMemo(() => {
    const rows: Record<number, CardMonthRow[]> = {};

    cards.forEach((card) => {
      const installments = installmentsByCard[card.id] || [];
      const subscriptions = (subscriptionsByCard[card.id] || []).filter((item) => item.is_active);
      const monthlySubscription = subscriptions.reduce((sum, item) => sum + item.monthly_amount, 0);

      rows[card.id] = Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const fatura = installments.reduce((sum, installment) => sum + getInstallmentForMonth(installment, month, viewYear), 0);
        const variavel = 0;
        const assinaturas = monthlySubscription;
        return {
          month,
          label: MONTHS[index],
          fatura,
          variavel,
          assinaturas,
          total: fatura + variavel + assinaturas,
        };
      });
    });

    return rows;
  }, [cards, installmentsByCard, subscriptionsByCard, viewYear]);

  const consolidatedMonthRows = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const cardCommitted = cards.reduce((sum, card) => sum + (cardMonthlyRows[card.id]?.[index]?.total || 0), 0);
      const loansCommitted = loans.reduce((sum, loan) => {
        const schedule = loanSchedules[loan.id] || [];
        return sum + schedule.filter((item) => item.year === viewYear && item.month === month).reduce((acc, item) => acc + item.amount, 0);
      }, 0);
      return {
        month,
        label: MONTHS[index],
        total: cardCommitted + loansCommitted,
      };
    });
  }, [cards, cardMonthlyRows, loans, loanSchedules, viewYear]);

  const cardLimitRows = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    return cards.map((card) => {
      const limit = cardLimits[String(card.id)] || 0;
      const used = (cardMonthlyRows[card.id] || []).find((item) => item.month === (viewYear === currentYear ? currentMonth : 1))?.total || 0;
      return {
        id: `card-${card.id}`,
        label: `Cartão ${card.bank_name}`,
        total: limit,
        used,
        available: limit - used,
      };
    });
  }, [cards, cardLimits, cardMonthlyRows, viewYear]);

  const loanLimitRows = useMemo(() => {
    return loans.map((loan) => {
      const remaining = loan.remaining_installments * loan.installment_amount;
      const paid = Math.max(loan.total_amount - remaining, 0);
      return {
        id: `loan-${loan.id}`,
        label: loan.bank_name ? `Empréstimo ${loan.bank_name}` : loan.name,
        total: loan.total_amount,
        used: paid,
        available: remaining,
      };
    });
  }, [loans]);

  const outstandingByType = useMemo(() => {
    const grouped = new Map<string, number>();

    cards.forEach((card) => {
      const total = (installmentsByCard[card.id] || []).reduce((sum, installment) => sum + installment.remaining_installments * installment.monthly_amount, 0);
      grouped.set(card.bank_name, (grouped.get(card.bank_name) || 0) + total);
    });

    loans.forEach((loan) => {
      const key = loan.bank_name ? `Empréstimo ${loan.bank_name}` : loan.name;
      grouped.set(key, (grouped.get(key) || 0) + loan.remaining_installments * loan.installment_amount);
    });

    return Array.from(grouped.entries()).map(([label, total]) => ({ label, total }));
  }, [cards, installmentsByCard, loans]);

  const openLimitEditor = (cardId: number) => {
    setEditingLimitId(cardId);
    setLimitInput(String(cardLimits[String(cardId)] || ""));
  };

  const saveLimit = () => {
    if (editingLimitId === null) return;
    const value = parseFloat(limitInput.replace(",", "."));
    setCardLimits((current) => ({
      ...current,
      [String(editingLimitId)]: Number.isNaN(value) ? 0 : value,
    }));
    setEditingLimitId(null);
    setLimitInput("");
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-950 text-gray-100 items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? "" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-black/60 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setSidebarOpen(false)} />
        <div className={`absolute left-0 top-0 h-full w-64 bg-gray-900 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <Sidebar />
        </div>
      </div>
      <div className="hidden lg:block w-64 flex-shrink-0"><Sidebar /></div>

      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center gap-4">
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <CreditCard className="w-5 h-5 text-purple-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Cartões e dívidas</h1>
            <p className="text-xs text-gray-400">Visão anual consolidada e por cartão</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5">
            <button onClick={() => setViewYear((year) => year - 1)} className="text-gray-400 hover:text-white transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-white w-12 text-center">{viewYear}</span>
            <button onClick={() => setViewYear((year) => year + 1)} className="text-gray-400 hover:text-white transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[420px,1fr] gap-6">
            <div className="space-y-6">
              <section className="rounded-2xl border border-[#6d1d4f] bg-[#741b4d] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                  <h2 className="text-white font-bold">Limites</h2>
                  <span className="text-xs text-white/70">Você pode editar os limites dos cartões</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#6a1546] text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">Limites</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Usado</th>
                        <th className="px-4 py-3 text-right">Disponível</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cardLimitRows.map((row) => (
                        <tr key={row.id} className="border-t border-white/10 text-white">
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <span>{row.label}</span>
                              {row.id.startsWith("card-") && (
                                editingLimitId === Number(row.id.replace("card-", "")) ? (
                                  <span className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={limitInput}
                                      onChange={(e) => setLimitInput(e.target.value)}
                                      className="w-24 px-2 py-1 rounded bg-black/20 border border-white/10 text-white text-xs"
                                      autoFocus
                                      onKeyDown={(e) => e.key === "Enter" && saveLimit()}
                                    />
                                    <button onClick={saveLimit} className="p-1 rounded bg-emerald-600 hover:bg-emerald-500"><Check className="w-3 h-3" /></button>
                                    <button onClick={() => setEditingLimitId(null)} className="p-1 rounded bg-white/10 hover:bg-white/15"><X className="w-3 h-3" /></button>
                                  </span>
                                ) : (
                                  <button onClick={() => openLimitEditor(Number(row.id.replace("card-", "")))} className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">{row.total > 0 ? fmt(row.total) : "—"}</td>
                          <td className="px-4 py-3 text-right">{fmt(row.used)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${row.available >= 0 ? "text-emerald-200" : "text-red-200"}`}>{row.total > 0 ? fmt(row.available) : "—"}</td>
                        </tr>
                      ))}
                      {loanLimitRows.map((row) => (
                        <tr key={row.id} className="border-t border-white/10 text-white">
                          <td className="px-4 py-3">{row.label}</td>
                          <td className="px-4 py-3 text-right">{fmt(row.total)}</td>
                          <td className="px-4 py-3 text-right">{fmt(row.used)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-200">{fmt(row.available)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-[#6d1d4f] bg-[#741b4d] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h2 className="text-white font-bold">Fatura parcelas / dívida restante</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#6a1546] text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-right">Fatura parcelas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingByType.map((row) => (
                        <tr key={row.label} className="border-t border-white/10 text-white">
                          <td className="px-4 py-3">{row.label}</td>
                          <td className="px-4 py-3 text-right">{fmt(row.total)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-white/10 text-white font-semibold bg-black/10">
                        <td className="px-4 py-3">Totais por coluna</td>
                        <td className="px-4 py-3 text-right">{fmt(outstandingByType.reduce((sum, row) => sum + row.total, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-white/10 bg-[#2b2b2b] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h2 className="text-white font-bold">Geral</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead className="bg-[#3b3b3b] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Ano</th>
                      <th className="px-4 py-3 text-left">Mês</th>
                      <th className="px-4 py-3 text-right">Comprometidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidatedMonthRows.map((row, index) => (
                      <tr key={row.label} className="border-t border-white/10 text-gray-100">
                        <td className="px-4 py-3">{index === 0 ? viewYear : ""}</td>
                        <td className="px-4 py-3">{row.label.toLowerCase()}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {cards.map((card) => {
              const rows = cardMonthlyRows[card.id] || [];
              const annualTotal = rows.reduce((sum, row) => sum + row.total, 0);
              const currentMonthTotal = rows[new Date().getMonth()]?.total || 0;
              return (
                <section key={card.id} className="rounded-2xl overflow-hidden border border-white/10" style={{ backgroundColor: `${card.color}22` }}>
                  <div className="px-5 py-4 border-b border-white/10 text-white" style={{ backgroundColor: `${card.color}cc` }}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="font-bold">{card.bank_name.toLowerCase()} cartão - {fmt(annualTotal)}</h2>
                        <p className="text-xs text-white/80 mt-1">{card.card_name} · fecha dia {card.closing_day} · vence dia {card.due_day}</p>
                      </div>
                      <div className="text-right text-xs text-white/80">
                        <p>Atual: <strong className="text-white">{fmt(currentMonthTotal)}</strong></p>
                        <p>Limite manual: <strong className="text-white">{cardLimits[String(card.id)] ? fmt(cardLimits[String(card.id)]) : "—"}</strong></p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[540px]">
                      <thead className="bg-black/20 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Mês</th>
                          <th className="px-4 py-3 text-right">Fatura Atual</th>
                          <th className="px-4 py-3 text-right">Gastos Variáveis</th>
                          <th className="px-4 py-3 text-right">Assinaturas</th>
                          <th className="px-4 py-3 text-right">Total Mensal Previsto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={`${card.id}-${row.month}`} className="border-t border-white/10 text-white">
                            <td className="px-4 py-3">{row.label}</td>
                            <td className="px-4 py-3 text-right">{row.fatura > 0 ? fmt(row.fatura) : "R$ 0,00"}</td>
                            <td className="px-4 py-3 text-right">{fmt(row.variavel)}</td>
                            <td className="px-4 py-3 text-right">{row.assinaturas > 0 ? fmt(row.assinaturas) : "R$ 0,00"}</td>
                            <td className="px-4 py-3 text-right font-semibold">{fmt(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>

          {loans.length > 0 && (
            <section className="rounded-2xl overflow-hidden border border-white/10 bg-[#321212]">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2 text-white">
                <Landmark className="w-4 h-4 text-red-300" />
                <h2 className="font-bold">Empréstimos</h2>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-5">
                {loans.map((loan) => (
                  <div key={loan.id} className="rounded-2xl border border-white/10 bg-black/10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 text-white">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{loan.name}</h3>
                          <p className="text-xs text-white/70">{loan.bank_name || "Banco"} · vence dia {loan.due_day}</p>
                        </div>
                        <div className="text-right text-xs text-white/70">
                          <p>Total: <strong className="text-white">{fmt(loan.total_amount)}</strong></p>
                          <p>Restante: <strong className="text-white">{fmt(loan.remaining_installments * loan.installment_amount)}</strong></p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[420px]">
                        <thead className="bg-black/20 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">Mês</th>
                            <th className="px-4 py-3 text-right">Parcela</th>
                            <th className="px-4 py-3 text-right">Número</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(loanSchedules[loan.id] || []).filter((item) => item.year === viewYear).map((item) => (
                            <tr key={`${loan.id}-${item.year}-${item.month}-${item.installment_number}`} className="border-t border-white/10 text-white">
                              <td className="px-4 py-3">{item.month_name}/{item.year}</td>
                              <td className="px-4 py-3 text-right">{fmt(item.amount)}</td>
                              <td className="px-4 py-3 text-right">{item.installment_number}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
