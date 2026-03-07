"use client";

import { Trash2 } from "lucide-react";

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  category?: {
    id: number;
    name: string;
    icon: string;
    color: string;
  } | null;
  created_at: string;
}

export default function TransactionList({
  transactions,
  onDelete,
}: {
  transactions: Transaction[];
  onDelete: (id: number) => void;
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="bg-[#1a1a2e]/60 backdrop-blur border border-white/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-white">
          📋 Transações Recentes
        </h3>
        <span className="text-sm text-gray-500">
          {transactions.length} itens
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <span className="text-5xl mb-4">🏦</span>
          <p className="text-lg font-medium">Nenhuma transação</p>
          <p className="text-sm mt-1">
            Envie uma mensagem no Telegram ou adicione manualmente
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Ícone da categoria */}
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{
                    background: `${t.category?.color || "#6B7280"}15`,
                  }}
                >
                  {t.category?.icon || "📦"}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {t.description || "Sem descrição"}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {t.category?.name || "Outros"} •{" "}
                    {formatDate(t.created_at)} às {formatTime(t.created_at)}
                  </p>
                </div>
              </div>

              {/* Valor + Delete */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-3">
                <span
                  className={`font-semibold text-sm sm:text-base ${
                    t.type === "income" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </span>
                <button
                  onClick={() => onDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/20 text-gray-600 hover:text-rose-400 transition-all"
                  title="Remover transação"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
