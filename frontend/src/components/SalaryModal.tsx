"use client";

import { useState, useEffect } from "react";
import { X, Wallet, ChevronRight, AlertCircle } from "lucide-react";
import {
  getSalaryPaymentInfo,
  MONTHS_PT,
  WEEKDAYS_PT,
} from "@/lib/businessDays";
import { api } from "@/lib/api";

interface SalaryConfig {
  total_amount: number;
  has_two_parts: boolean;
  part1_amount: number;
  part1_day: number;
  part2_amount: number | null;
  part2_day: number | null;
}

interface SalaryModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function PaymentPreview({
  day,
  amount,
  label,
}: {
  day: number;
  amount: number;
  label: string;
}) {
  const now = new Date();
  const previews = Array.from({ length: 4 }, (_, i) => {
    const month = ((now.getMonth() + i) % 12) + 1;
    const year = now.getFullYear() + Math.floor((now.getMonth() + i) / 12);
    return { month, year, ...getSalaryPaymentInfo(year, month, day) };
  });

  return (
    <div className="mt-3 bg-black/20 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">
        {label} — Próximos pagamentos
      </p>
      <div className="space-y-2">
        {previews.map((p) => (
          <div
            key={`${p.month}-${p.year}`}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-gray-400 w-24">
              {MONTHS_PT[p.month].slice(0, 3)}/{p.year}
            </span>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-white font-medium">
                {String(p.paymentDate.getDate()).padStart(2, "0")}/
                {String(p.paymentDate.getMonth() + 1).padStart(2, "0")}
              </span>
              <span className="text-gray-500 text-xs">
                {WEEKDAYS_PT[p.paymentDate.getDay()]}
              </span>
              {p.isAdjusted && (
                <span className="flex items-center gap-1 text-amber-400 text-xs bg-amber-400/10 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  {p.skipReason}
                </span>
              )}
            </div>
            <span className="text-emerald-400 font-semibold text-sm">
              R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SalaryModal({ onClose, onSaved }: SalaryModalProps) {
  const isDemo = typeof window !== "undefined" && localStorage.getItem("demo_mode") === "true";

  const [totalAmount, setTotalAmount] = useState("");
  const [hasTwoParts, setHasTwoParts] = useState(false);
  const [part1Amount, setPart1Amount] = useState("");
  const [part1Day, setPart1Day] = useState(5);
  const [part2Amount, setPart2Amount] = useState("");
  const [part2Day, setPart2Day] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Carrega config existente
  useEffect(() => {
    if (isDemo) {
      setTotalAmount("6700");
      setHasTwoParts(true);
      setPart1Amount("3350");
      setPart1Day(15);
      setPart2Amount("3350");
      setPart2Day(30);
      return;
    }
    api.get("/salary/config").then((cfg) => {
      if (cfg) {
        setTotalAmount(String(cfg.total_amount));
        setHasTwoParts(cfg.has_two_parts);
        setPart1Amount(String(cfg.part1_amount));
        setPart1Day(cfg.part1_day);
        if (cfg.part2_amount) setPart2Amount(String(cfg.part2_amount));
        if (cfg.part2_day) setPart2Day(cfg.part2_day);
      }
    }).catch(() => {});
  }, [isDemo]);

  // Sincroniza part1Amount ao mudar total (quando 1 parcela)
  useEffect(() => {
    if (!hasTwoParts && totalAmount) {
      setPart1Amount(totalAmount);
    }
  }, [hasTwoParts, totalAmount]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const total = parseFloat(totalAmount);
    const p1 = parseFloat(part1Amount);
    const p2 = hasTwoParts ? parseFloat(part2Amount) : null;

    if (hasTwoParts && p2 !== null) {
      if (Math.abs(p1 + p2 - total) > 0.01) {
        setError(
          `Parcela 1 (R$${p1.toFixed(2)}) + Parcela 2 (R$${p2.toFixed(2)}) ≠ Total (R$${total.toFixed(2)})`
        );
        return;
      }
    }

    if (isDemo) {
      onSaved();
      onClose();
      return;
    }

    setLoading(true);
    try {
      await api.post("/salary/config", {
        total_amount: total,
        has_two_parts: hasTwoParts,
        part1_amount: p1,
        part1_day: part1Day,
        part2_amount: hasTwoParts ? p2 : null,
        part2_day: hasTwoParts ? part2Day : null,
      });
      onSaved();
      onClose();
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const total = parseFloat(totalAmount) || 0;
  const p1 = parseFloat(part1Amount) || 0;
  const p2 = parseFloat(part2Amount) || 0;
  const showP1Preview = p1 > 0 && part1Day > 0;
  const showP2Preview = hasTwoParts && p2 > 0 && part2Day > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg my-4 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Configurar Salário
              </h3>
              <p className="text-xs text-gray-500">
                Datas ajustadas automaticamente para dias úteis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Total */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Salário Total (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xl font-bold placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="0,00"
              required
            />
          </div>

          {/* Toggle parcelas */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <button
              type="button"
              onClick={() => setHasTwoParts(!hasTwoParts)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                hasTwoParts ? "bg-emerald-500" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  hasTwoParts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <div>
              <p className="text-sm font-medium text-white">
                Dividir em 2 parcelas
              </p>
              <p className="text-xs text-gray-500">
                Ex: adiantamento no dia 15 + complemento no dia 30
              </p>
            </div>
          </div>

          {/* Parcela 1 */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">
                1
              </span>
              {hasTwoParts ? "Primeira Parcela" : "Pagamento"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={part1Amount}
                  onChange={(e) => setPart1Amount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="0,00"
                  required
                  disabled={!hasTwoParts}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Todo dia
                </label>
                <select
                  value={part1Day}
                  onChange={(e) => setPart1Day(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d} className="bg-[#1a1a2e]">
                      Dia {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {showP1Preview && (
              <PaymentPreview
                day={part1Day}
                amount={p1}
                label={hasTwoParts ? "1ª Parcela" : "Pagamento"}
              />
            )}
          </div>

          {/* Parcela 2 */}
          {hasTwoParts && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold">
                  2
                </span>
                Segunda Parcela
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={part2Amount}
                    onChange={(e) => setPart2Amount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="0,00"
                    required={hasTwoParts}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Todo dia
                  </label>
                  <select
                    value={part2Day}
                    onChange={(e) => setPart2Day(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d} className="bg-[#1a1a2e]">
                        Dia {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {showP2Preview && (
                <PaymentPreview
                  day={part2Day}
                  amount={p2}
                  label="2ª Parcela"
                />
              )}

              {/* Validação soma */}
              {total > 0 && p1 > 0 && p2 > 0 && (
                <div
                  className={`flex items-center justify-between p-3 rounded-xl text-sm ${
                    Math.abs(p1 + p2 - total) < 0.01
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  <span>
                    R$ {p1.toFixed(2)} + R$ {p2.toFixed(2)}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="font-semibold">
                    R$ {(p1 + p2).toFixed(2)}{" "}
                    {Math.abs(p1 + p2 - total) < 0.01 ? "✓" : `≠ R$ ${total.toFixed(2)}`}
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
          >
            {loading ? "Salvando..." : "💾 Salvar Configuração"}
          </button>
        </form>
      </div>
    </div>
  );
}
