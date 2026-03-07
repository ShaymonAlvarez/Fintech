"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CategoryData {
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

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomBarTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 shadow-xl">
        <p className="text-gray-400 text-sm mb-2 font-medium">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-sm">
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Charts({
  categoryData,
  monthlyData,
}: {
  categoryData: CategoryData[];
  monthlyData: MonthlyData[];
}) {
  const barData = monthlyData.map((d) => ({
    name: MONTH_NAMES[d.month - 1],
    Receitas: d.income,
    Despesas: d.expense,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Pizza — Gastos por Categoria */}
      <div className="bg-[#1a1a2e]/60 backdrop-blur border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          💳 Gastos por Categoria
        </h3>

        {categoryData.length > 0 ? (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="total"
                  nameKey="category_name"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.category_color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legenda */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 justify-center">
              {categoryData.map((cat, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: cat.category_color }}
                  />
                  <span className="text-gray-400 truncate">
                    {cat.category_icon} {cat.category_name}
                  </span>
                  <span className="text-white font-medium">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-gray-500">
            <span className="text-4xl mb-3">📭</span>
            <p>Sem despesas neste período</p>
          </div>
        )}
      </div>

      {/* Gráfico de Barras — Evolução Mensal */}
      <div className="bg-[#1a1a2e]/60 backdrop-blur border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          📈 Evolução Mensal
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} barGap={4}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke="#475569"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#475569"
              fontSize={12}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
              width={45}
            />
            <Tooltip content={<CustomBarTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "16px" }}
              formatter={(value: string) => (
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                  {value}
                </span>
              )}
            />
            <Bar
              dataKey="Receitas"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="Despesas"
              fill="#f43f5e"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
