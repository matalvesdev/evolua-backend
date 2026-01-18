"use client";

import Link from "next/link";
import { useFinances } from "@/hooks";

export default function FinanceiroPage() {
  const {
    balanceData,
    monthlyData,
    revenueSources,
    transactions,
    loading,
    error,
  } = useFinances();

  // Pegar apenas as 5 transações mais recentes
  const recentTransactions = transactions.slice(0, 5);

  // Calcular receitas e despesas do mês atual
  const currentMonth = new Date().toLocaleDateString("pt-BR", { month: "short" });
  const currentMonthData = monthlyData.find(m => 
    m.month.toLowerCase() === currentMonth.toLowerCase()
  );
  const monthlyIncome = currentMonthData?.income || 0;
  const monthlyExpenses = currentMonthData?.expenses || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8fb] via-[#e8edf5] to-[#dce5f0] p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-gray-600 mt-1">
              Acompanhe sua saúde financeira e transações
            </p>
          </div>
          <Link
            href="/dashboard/financeiro/movimentacoes"
            className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">
              receipt_long
            </span>
            Ver Movimentações
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Balance */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">
                      Saldo Total
                    </span>
                    <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-white text-xl">
                        account_balance_wallet
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    R$ {balanceData.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                    <span className="material-symbols-outlined text-sm">
                      check_circle
                    </span>
                    Atualizado
                  </div>
                </div>
              </div>

              {/* Monthly Income */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">
                      Receitas do Mês
                    </span>
                    <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-white text-xl">
                        trending_up
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    R$ {monthlyIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                    <span className="material-symbols-outlined text-sm">
                      check_circle
                    </span>
                    Mês atual
                  </div>
                </div>
              </div>

              {/* Monthly Expenses */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-600 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">
                      Despesas do Mês
                    </span>
                    <div className="size-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-white text-xl">
                        trending_down
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    R$ {monthlyExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-rose-600">
                    <span className="material-symbols-outlined text-sm">
                      check_circle
                    </span>
                    Mês atual
                  </div>
                </div>
              </div>

              {/* Pending Payments */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">
                      A Receber
                    </span>
                    <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-white text-xl">
                        schedule
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    R$ {balanceData.pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                    <span className="material-symbols-outlined text-sm">
                      pending
                    </span>
                    Aguardando pagamento
                  </div>
                </div>
              </div>
            </div>

            {/* Charts & Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Revenue Chart */}
              <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">
                    Receitas Mensais
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Últimos 6 meses
                  </p>
                </div>

                <div className="p-6">
                  {monthlyData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="size-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-primary text-4xl">
                          bar_chart
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Sistema Financeiro em Desenvolvimento
                      </h3>
                      <p className="text-gray-600 max-w-sm">
                        Em breve você poderá acompanhar suas receitas mensais através deste gráfico interativo.
                      </p>
                    </div>
                  ) : (
                    <div className="h-64">
                      {/* TODO: Adicionar Chart.js ou Recharts aqui */}
                    </div>
                  )}
                </div>
              </div>

              {/* Revenue Sources */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">
                    Fontes de Receita
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Distribuição atual
                  </p>
                </div>

                <div className="p-6">
                  {revenueSources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="size-16 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-purple-600 text-3xl">
                          pie_chart
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Dados não disponíveis
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* TODO: Adicionar lista de fontes */}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Transações Recentes
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Últimos lançamentos
                  </p>
                </div>
                <Link
                  href="/dashboard/financeiro/movimentacoes"
                  className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1"
                >
                  Ver todas
                  <span className="material-symbols-outlined text-lg">
                    arrow_forward
                  </span>
                </Link>
              </div>

              <div className="overflow-x-auto">
                {recentTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="size-20 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-blue-600 text-4xl">
                        receipt_long
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nenhuma Transação Registrada
                    </h3>
                    <p className="text-gray-600 max-w-md mb-6">
                      O módulo financeiro está sendo preparado para integração. Em breve você poderá gerenciar todas as suas transações aqui.
                    </p>
                    <button className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl">
                        add_circle
                      </span>
                      Nova Transação (em breve)
                    </button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Paciente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-white/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-gray-400">
                                {transaction.type === "income" ? "arrow_upward" : "arrow_downward"}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {transaction.type === "income" ? "Receita" : "Despesa"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.patient}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(transaction.date).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`text-sm font-semibold ${
                                transaction.type === "income"
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {transaction.type === "income" ? "+ " : "- "}
                              R$ {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                transaction.status === "paid"
                                  ? "bg-green-100 text-green-700"
                                  : transaction.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {transaction.status === "paid"
                                ? "Pago"
                                : transaction.status === "pending"
                                ? "Pendente"
                                : "Atrasado"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
