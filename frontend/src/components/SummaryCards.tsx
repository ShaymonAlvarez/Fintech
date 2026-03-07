"use client";

interface SummaryData {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

export default function SummaryCards({ data }: { data: SummaryData | null }) {
  if (!data) return null;

  const savings =
    data.total_income > 0
      ? ((data.total_income - data.total_expense) / data.total_income) * 100
      : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const cards = [
    {
      title: "Saldo do Mês",
      value: formatCurrency(data.balance),
      icon: "💰",
      gradient: "from-violet-600 to-indigo-600",
      shadow: "shadow-violet-600/20",
      valueColor: data.balance >= 0 ? "text-white" : "text-rose-300",
    },
    {
      title: "Receitas",
      value: formatCurrency(data.total_income),
      icon: "📥",
      gradient: "from-emerald-600 to-teal-600",
      shadow: "shadow-emerald-600/20",
      valueColor: "text-white",
    },
    {
      title: "Despesas",
      value: formatCurrency(data.total_expense),
      icon: "📤",
      gradient: "from-rose-600 to-pink-600",
      shadow: "shadow-rose-600/20",
      valueColor: "text-white",
    },
    {
      title: "Economia",
      value: `${savings.toFixed(1)}%`,
      icon: "📊",
      gradient: "from-amber-600 to-orange-600",
      shadow: "shadow-amber-600/20",
      valueColor: "text-white",
      subtitle: `${data.transaction_count} transações`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={card.title}
          className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 shadow-lg ${card.shadow} card-hover`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-sm font-medium">
              {card.title}
            </span>
            <span className="text-2xl">{card.icon}</span>
          </div>
          <p className={`text-2xl font-bold ${card.valueColor} truncate`}>
            {card.value}
          </p>
          {card.subtitle && (
            <p className="text-white/50 text-xs mt-1">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}
