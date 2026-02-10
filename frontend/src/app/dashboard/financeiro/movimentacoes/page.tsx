"use client"

import * as React from "react"

interface Transaction {
  id: number
  date: string
  time: string
  patient: {
    name: string
    avatar?: string
    initials?: string
    initialsColor?: string
  }
  amount: number
  paymentMethod: string
  status: "paid" | "pending" | "overdue"
}

export default function MovimentacoesPage() {
  const [period, setPeriod] = React.useState("Novembro 2023")
  const [status, setStatus] = React.useState("Todos os status")
  const [patientSearch, setPatientSearch] = React.useState("")

  const transactions: Transaction[] = [
    {
      id: 1,
      date: "24 Nov 2023",
      time: "09:30",
      patient: {
        name: "Ana Souza",
        avatar: "https://i.pravatar.cc/150?img=1",
      },
      amount: 250.0,
      paymentMethod: "Pix",
      status: "paid",
    },
    {
      id: 2,
      date: "23 Nov 2023",
      time: "14:00",
      patient: {
        name: "Carlos Lima",
        avatar: "https://i.pravatar.cc/150?img=2",
      },
      amount: 200.0,
      paymentMethod: "Cartão de Crédito",
      status: "pending",
    },
    {
      id: 3,
      date: "22 Nov 2023",
      time: "10:00",
      patient: {
        name: "Beatriz M.",
        avatar: "https://i.pravatar.cc/150?img=3",
      },
      amount: 300.0,
      paymentMethod: "Boleto Bancário",
      status: "overdue",
    },
    {
      id: 4,
      date: "20 Nov 2023",
      time: "16:45",
      patient: {
        name: "João Lucas",
        initials: "JL",
        initialsColor: "primary",
      },
      amount: 150.0,
      paymentMethod: "Dinheiro",
      status: "paid",
    },
    {
      id: 5,
      date: "18 Nov 2023",
      time: "11:00",
      patient: {
        name: "Maria Paula",
        initials: "MP",
        initialsColor: "purple",
      },
      amount: 250.0,
      paymentMethod: "Pix",
      status: "paid",
    },
  ]

  const getStatusBadge = (status: string) => {
    const badges = {
      paid: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30",
      pending:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30",
      overdue:
        "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30",
    }
    return badges[status as keyof typeof badges]
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      paid: "Pago",
      pending: "Pendente",
      overdue: "Atrasado",
    }
    return labels[status as keyof typeof labels]
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-96 bg-linear-to-b from-purple-50/50 to-transparent dark:from-purple-900/10 dark:to-transparent -z-10 pointer-events-none"></div>

      <div className="max-w-[1200px] mx-auto flex flex-col gap-8 p-6 lg:p-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2 text-gray-900 dark:text-white">
              Movimentações Financeiras
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base">
              Controle de receitas, despesas e emissão de recibos.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 font-bold text-sm shadow-sm hover:bg-white transition-colors">
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400" style={{ fontSize: 20 }}>
                download
              </span>
              Exportar Relatório
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Período
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    calendar_today
                  </span>
                </span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none appearance-none font-medium"
                >
                  <option>Novembro 2023</option>
                  <option>Outubro 2023</option>
                  <option>Últimos 30 dias</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Status
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    filter_list
                  </span>
                </span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none appearance-none font-medium"
                >
                  <option>Todos os status</option>
                  <option>Pago</option>
                  <option>Pendente</option>
                  <option>Atrasado</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Paciente
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    person_search
                  </span>
                </span>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Nome do paciente"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none font-medium placeholder:text-gray-500 dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button className="w-full h-[42px] bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  check
                </span>
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/5">
                  <th className="py-5 px-6 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="py-5 px-6 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="py-5 px-6 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="py-5 px-6 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Forma de Pgto
                  </th>
                  <th className="py-5 px-6 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-5 px-6 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-right">
                    Ações Rápidas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5 text-sm">
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="group hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-6 text-gray-900 dark:text-gray-200 font-medium">
                      {transaction.date}
                      <div className="text-[10px] text-gray-600 dark:text-gray-400">
                        {transaction.time}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {transaction.patient.avatar ? (
                          <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9"
                            style={{ backgroundImage: `url(${transaction.patient.avatar})` }}
                          ></div>
                        ) : (
                          <div
                            className={`rounded-full size-9 flex items-center justify-center font-bold text-xs ${
                              transaction.patient.initialsColor === "primary"
                                ? "bg-primary/10 text-primary"
                                : "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                            }`}
                          >
                            {transaction.patient.initials}
                          </div>
                        )}
                        <span className="font-bold text-gray-900 dark:text-white">
                          {transaction.patient.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">
                      R$ {transaction.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-400">
                      {transaction.paymentMethod}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(transaction.status)}`}
                      >
                        <span className="size-1.5 rounded-full bg-current"></span>
                        {getStatusLabel(transaction.status)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {transaction.status === "paid" && (
                          <>
                            <button
                              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-primary/10 hover:text-primary transition-colors"
                              title="Gerar Recibo"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                receipt_long
                              </span>
                            </button>
                            <button
                              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-primary/10 hover:text-primary transition-colors"
                              title="Enviar Cobrança"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                send_money
                              </span>
                            </button>
                          </>
                        )}
                        {transaction.status === "pending" && (
                          <button className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors">
                            Cobrar
                          </button>
                        )}
                        {transaction.status === "overdue" && (
                          <button className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                            Reenviar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-white/5 bg-white/30 dark:bg-black/10">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Mostrando <span className="font-bold">1-5</span> de{" "}
              <span className="font-bold">124</span> resultados
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50">
                Anterior
              </button>
              <button className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 rounded-lg transition-colors">
                1
              </button>
              <button className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors">
                2
              </button>
              <button className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors">
                3
              </button>
              <button className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors">
                Próximo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
