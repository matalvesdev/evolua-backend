"use client"

import * as React from "react"

interface Transaction {
  id: number
  description: string
  category: string
  categoryColor: string
  date: string
  amount: number
  type: "income" | "expense"
}

export default function FinanceiroPage() {
  const [period, setPeriod] = React.useState<"month" | "year">("month")

  const transactions: Transaction[] = [
    {
      id: 1,
      description: "Consulta - Ana Souza",
      category: "Serviços",
      categoryColor: "purple",
      date: "Hoje, 10:00",
      amount: 250.0,
      type: "income",
    },
    {
      id: 2,
      description: "Aluguel Consultório",
      category: "Despesa Fixa",
      categoryColor: "red",
      date: "Ontem",
      amount: 1200.0,
      type: "expense",
    },
    {
      id: 3,
      description: "Consulta - Carlos Lima",
      category: "Serviços",
      categoryColor: "purple",
      date: "08 Nov 2023",
      amount: 250.0,
      type: "income",
    },
  ]

  const monthlyData = [
    { month: "Jun", percentage: 60 },
    { month: "Jul", percentage: 75 },
    { month: "Ago", percentage: 45 },
    { month: "Set", percentage: 85 },
    { month: "Out", percentage: 55 },
    { month: "Nov", percentage: 90, isHighlight: true },
  ]

  return (
    <div className="relative min-h-screen">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-900/10 dark:to-transparent -z-10 pointer-events-none"></div>
      <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="max-w-[1200px] mx-auto flex flex-col gap-8 p-6 lg:p-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-2 text-gray-900 dark:text-white">
              Seu Financeiro 💰
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base">
              Acompanhe seus ganhos e despesas em tempo real.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-white dark:bg-white/5 rounded-lg p-1 shadow-sm border border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setPeriod("month")}
                className={`px-4 py-1.5 rounded text-sm font-bold transition-colors ${
                  period === "month"
                    ? "bg-gray-100 dark:bg-primary/20 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setPeriod("year")}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  period === "year"
                    ? "bg-gray-100 dark:bg-primary/20 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                Anual
              </button>
            </div>
          </div>
        </div>

        {/* Balance and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Balance Card */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/15 transition-all"></div>
            <div className="relative z-10 flex flex-col justify-between h-full gap-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Saldo em conta
                  </p>
                  <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                    R$ 14.250,00
                  </h2>
                </div>
                <div className="p-2 bg-white/50 dark:bg-white/10 rounded-lg">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>
                    account_balance_wallet
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                <div className="bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 rounded-xl p-4 flex items-center gap-3">
                  <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      trending_up
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Entradas do mês
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">R$ 5.420,00</p>
                  </div>
                </div>
                <div className="bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 rounded-xl p-4 flex items-center gap-3">
                  <div className="size-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      pending_actions
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Pendentes
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">R$ 1.200,00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="glass-card rounded-2xl p-6 h-full flex flex-col justify-center gap-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Ações Rápidas
              </h3>
              <button className="w-full group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary/30 hover:shadow-md transition-all">
                <div className="size-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                    arrow_downward
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                    Registrar Entrada
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Pagamento de paciente</p>
                </div>
              </button>
              <button className="w-full group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-red-400/30 hover:shadow-md transition-all">
                <div className="size-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                    arrow_upward
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-500 transition-colors">
                    Nova Despesa
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Contas, aluguel, etc.</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Evolution Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Evolução Mensal</h3>
              <button className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center gap-2 group w-full">
                  <div
                    className={`relative w-full max-w-[40px] rounded-t-lg ${
                      data.isHighlight
                        ? "bg-primary/5 dark:bg-white/5"
                        : "bg-primary/10 dark:bg-white/5"
                    }`}
                    style={{ height: `${(data.percentage / 100) * 224}px` }}
                  >
                    {data.isHighlight && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        R$ 14.2k
                      </div>
                    )}
                    <div
                      className={`absolute bottom-0 left-0 w-full rounded-t-lg ${
                        data.isHighlight
                          ? "bg-gradient-to-t from-primary to-purple-400 shadow-[0_0_15px_rgba(164,19,236,0.4)]"
                          : "bg-gradient-to-t from-primary/40 to-primary/80"
                      }`}
                      style={{ height: `${data.percentage}%` }}
                    ></div>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      data.isHighlight
                        ? "text-primary font-bold"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {data.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Source Pie Chart */}
          <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Origem de Receita
            </h3>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div
                className="relative size-48 rounded-full"
                style={{
                  background:
                    "conic-gradient(#a413ec 0% 65%, #22c55e 65% 85%, #fbbf24 85% 100%)",
                }}
              >
                <div className="absolute inset-4 bg-white/90 dark:bg-gray-900/90 rounded-full flex flex-col items-center justify-center backdrop-blur-sm">
                  <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-bold">
                    Total
                  </span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">100%</span>
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-primary"></div>
                  <span className="text-gray-600 dark:text-gray-300">Consultas</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">65%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600 dark:text-gray-300">Convênios</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">20%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-amber-400"></div>
                  <span className="text-gray-600 dark:text-gray-300">Outros</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">15%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Últimas Movimentações
            </h3>
            <a className="text-sm font-bold text-primary hover:underline" href="#">
              Ver extrato completo
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-bold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                  <th className="py-3 pl-2">Descrição</th>
                  <th className="py-3">Categoria</th>
                  <th className="py-3">Data</th>
                  <th className="py-3 text-right pr-2">Valor</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="group hover:bg-primary/5 transition-colors border-b border-gray-200 dark:border-white/5 last:border-0"
                  >
                    <td className="py-4 pl-2 font-medium text-gray-900 dark:text-white">
                      {transaction.description}
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          transaction.categoryColor === "purple"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                      >
                        {transaction.category}
                      </span>
                    </td>
                    <td className="py-4 text-gray-600 dark:text-gray-400">{transaction.date}</td>
                    <td
                      className={`py-4 text-right pr-2 font-bold ${
                        transaction.type === "income"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"} R${" "}
                      {transaction.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        .dark .glass-card {
          background: rgba(28, 16, 34, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  )
}
