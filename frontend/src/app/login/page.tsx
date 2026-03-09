"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const body: Record<string, unknown> = { username, password };
      if (isRegister && telegramId) {
        body.telegram_id = parseInt(telegramId);
      }

      const data = await api.post(endpoint, body);
      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { detail?: string };
      setError(error.detail || "Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-4">
      {/* Efeitos de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4 shadow-lg shadow-violet-500/25">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Finanças</h1>
          <p className="text-gray-500 mt-2">Controle financeiro pessoal</p>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-5 shadow-2xl"
        >
          <h2 className="text-xl font-semibold text-white text-center">
            {isRegister ? "Criar Conta" : "Entrar"}
          </h2>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              placeholder="seu_usuario"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="animate-fade-in">
              <label className="block text-sm text-gray-400 mb-2">
                Telegram ID{" "}
                <span className="text-gray-600">(opcional)</span>
              </label>
              <input
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                placeholder="123456789"
              />
              <p className="text-xs text-gray-600 mt-2">
                💡 Envie <code className="text-violet-400">/start</code> para{" "}
                <code className="text-violet-400">@userinfobot</code> no
                Telegram para saber seu ID
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#1a1a2e] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-600/25"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Carregando...
              </span>
            ) : isRegister ? (
              "Criar Conta"
            ) : (
              "Entrar"
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            {isRegister ? "Já tem conta?" : "Não tem conta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              {isRegister ? "Faça login" : "Cadastre-se"}
            </button>
          </p>
        </form>

        <p className="text-center text-xs text-gray-700 mt-6">
          💬 Registre gastos pelo Telegram • 📊 Acompanhe aqui
        </p>
      </div>
    </div>
  );
}
