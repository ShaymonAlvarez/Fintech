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
  Plus,
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

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  payment_type: string;
  card_id: number | null;
  created_at: string;
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

function getInvoiceMonth(dateString: string, closingDay: number) {
  const date = new Date(dateString);
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  if (date.getDate() > closingDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return { month, year };
}

export default function CartoesPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cards, setCards] = useState<CardData[]>([]);
  const [installmentsByCard, setInstallmentsByCard] = useState<Record<number, CardInstallment[]>>({});
  const [subscriptionsByCard, setSubscriptionsByCard] = useState<Record<number, CardSubscription[]>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanSchedules, setLoanSchedules] = useState<Record<number, LoanScheduleItem[]>>({});
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [cardLimits, setCardLimits] = useState<Record<string, number>>({});
  const [editingLimitId, setEditingLimitId] = useState<number | null>(null);
  const [limitInput, setLimitInput] = useState("");
  const [showCardModal, setShowCardModal] = useState(false);
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [newClosingDay, setNewClosingDay] = useState("5");
  const [newDueDay, setNewDueDay] = useState("12");
  const [newCardColor, setNewCardColor] = useState("#7c3aed");
  const [newCardIcon, setNewCardIcon] = useState("💳");
  const [variableCardId, setVariableCardId] = useState("");
  const [variableAmount, setVariableAmount] = useState("");
  const [variableDescription, setVariableDescription] = useState("");
  const [variableDate, setVariableDate] = useState(new Date().toISOString().slice(0, 10));
  const [variableCategoryId, setVariableCategoryId] = useState("");
  const [categories, setCategories] = useState<Array<{ id: number; name: string; icon: string }>>([]);

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
      const [cardsData, loansData, scheduleData, yearTransactions, categoriesData] = await Promise.all([
        api.get("/cards"),
        api.get("/loans"),
        api.get("/loans/schedule").catch(() => []),
        api.get(`/transactions?year=${viewYear}&limit=2000`).catch(() => []),
        api.get("/categories").catch(() => []),
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
      setTransactions(yearTransactions);
      setLoans(loansData);
      setLoanSchedules(scheduleMap);
      setCategories(categoriesData);
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
    setLoading(false);
  }, [router, viewYear]);

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
      const creditTransactions = transactions.filter(
        (transaction) =>
          transaction.type === "expense" &&
          transaction.payment_type === "credit" &&
          transaction.card_id === card.id
      );

      rows[card.id] = Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const fatura = installments.reduce((sum, installment) => sum + getInstallmentForMonth(installment, month, viewYear), 0);
        const variavel = creditTransactions.reduce((sum, transaction) => {
          const invoice = getInvoiceMonth(transaction.created_at, card.closing_day);
          if (invoice.year === viewYear && invoice.month === month) {
            return sum + transaction.amount;
          }
          return sum;
        }, 0);
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

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/cards", {
        bank_name: newBankName,
        card_name: newCardName,
        closing_day: parseInt(newClosingDay, 10),
        due_day: parseInt(newDueDay, 10),
        color: newCardColor,
        icon: newCardIcon || "💳",
      });
      setShowCardModal(false);
      setNewBankName("");
      setNewCardName("");
      setNewClosingDay("5");
      setNewDueDay("12");
      setNewCardColor("#7c3aed");
      setNewCardIcon("💳");
      loadData();
    } catch (error) {
      console.error("Erro ao criar cartão:", error);
    }
  };

  const handleCreateVariableExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/transactions", {
        amount: parseFloat(variableAmount),
        type: "expense",
        description: variableDescription,
        category_id: variableCategoryId ? parseInt(variableCategoryId, 10) : null,
        payment_type: "credit",
        card_id: variableCardId ? parseInt(variableCardId, 10) : null,
        created_at: `${variableDate}T12:00:00`,
      });
      setShowVariableModal(false);
      setVariableCardId("");
      setVariableAmount("");
      setVariableDescription("");
      setVariableDate(new Date().toISOString().slice(0, 10));
      setVariableCategoryId("");
      loadData();
    } catch (error) {
      console.error("Erro ao criar gasto variável do cartão:", error);
    }
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
          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
            <button onClick={() => setShowVariableModal(true)} className="px-3 py-2 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Gasto variável
            </button>
            <button onClick={() => setShowCardModal(true)} className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Banco / cartão
            </button>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5">
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

      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCardModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Novo banco / cartão</h3>
              <button onClick={() => setShowCardModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <input type="text" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Banco" required />
              <input type="text" value={newCardName} onChange={(e) => setNewCardName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Nome do cartão" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="1" max="31" value={newClosingDay} onChange={(e) => setNewClosingDay(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Dia fechamento" required />
                <input type="number" min="1" max="31" value={newDueDay} onChange={(e) => setNewDueDay(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Dia vencimento" required />
              </div>
              <div className="grid grid-cols-[1fr,96px] gap-3 items-center">
                <input type="color" value={newCardColor} onChange={(e) => setNewCardColor(e.target.value)} className="w-full h-12 rounded-xl bg-white/5 border border-white/10 p-2" />
                <input type="text" maxLength={2} value={newCardIcon} onChange={(e) => setNewCardIcon(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center" placeholder="💳" />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold">Salvar cartão</button>
            </form>
          </div>
        </div>
      )}

      {showVariableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowVariableModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Novo gasto variável no cartão</h3>
              <button onClick={() => setShowVariableModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateVariableExpense} className="space-y-4">
              <select value={variableCardId} onChange={(e) => setVariableCardId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" required>
                <option value="" className="bg-gray-900">Selecionar cartão</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id} className="bg-gray-900">{card.icon} {card.bank_name} · {card.card_name}</option>
                ))}
              </select>
              <input type="text" value={variableDescription} onChange={(e) => setVariableDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Descrição da compra" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" min="0.01" value={variableAmount} onChange={(e) => setVariableAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Valor" required />
                <input type="date" value={variableDate} onChange={(e) => setVariableDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" required />
              </div>
              <select value={variableCategoryId} onChange={(e) => setVariableCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white">
                <option value="" className="bg-gray-900">Categoria opcional</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id} className="bg-gray-900">{category.icon} {category.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Gastos variáveis são compras no crédito que não viraram parcela e entram na próxima fatura conforme o dia de fechamento.</p>
              <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">Salvar gasto variável</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
