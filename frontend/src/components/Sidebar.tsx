"use client";

import { Wallet, LogOut, LayoutDashboard, BarChart2, RefreshCw, CreditCard, CalendarDays, Sparkles } from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 h-full w-64 bg-[#0f0f23] border-r border-white/5
        z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto
      `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Finanças</h1>
              <p className="text-xs text-gray-500">Controle pessoal</p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="p-4 space-y-1">
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white font-medium transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </a>
          <a
            href="/dashboard/mensal"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white font-medium transition-colors"
          >
            <BarChart2 className="w-5 h-5" />
            Mensal por Categoria
          </a>

          {/* Separator */}
          <div className="pt-2 pb-1 px-4">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-medium">Planejamento</p>
          </div>

          <a
            href="/dashboard/recorrentes"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white font-medium transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Gastos Recorrentes
          </a>
          <a
            href="/dashboard/cartoes"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white font-medium transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            Cartões
          </a>
          <a
            href="/dashboard/diario"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white font-medium transition-colors"
          >
            <CalendarDays className="w-5 h-5" />
            Fluxo Diário
          </a>
          <a
            href="/dashboard/cenarios"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white font-medium transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Cenários de Gasto
          </a>
        </nav>

        {/* Info do bot */}
        <div className="mx-4 mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <p className="text-xs text-gray-500 mb-2">💬 Dica rápida</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Envie mensagens pelo Telegram para registrar gastos:
          </p>
          <div className="mt-2 space-y-1">
            <code className="block text-xs text-emerald-400">+150 salário</code>
            <code className="block text-xs text-rose-400">-45 mercado</code>
          </div>
        </div>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
