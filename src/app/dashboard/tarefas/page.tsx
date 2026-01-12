"use client";

import { useAppointments, useTodayAppointments } from "@/hooks";
import { useState } from "react";

export default function TarefasPage() {
  const { appointments: upcomingAppointments, loading: loadingUpcoming } = useAppointments({
    status: ["scheduled", "confirmed"],
    startDate: new Date(),
  });
  const { appointments: todayAppointments, loading: loadingToday } = useTodayAppointments();
  
  const [taskInput, setTaskInput] = useState("");

  // Filtra apenas os próximos 5 agendamentos
  const nextAppointments = upcomingAppointments.slice(0, 5);

  // Agrupa os agendamentos por data
  const appointmentsByDate = todayAppointments.reduce((acc: Record<string, typeof todayAppointments>, appointment) => {
    const date = new Date(appointment.dateTime).toLocaleDateString("pt-BR");
    if (!acc[date]) acc[date] = [];
    acc[date].push(appointment);
    return acc;
  }, {});

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const getAppointmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      evaluation: "Avaliação",
      session: "Sessão",
      follow_up: "Acompanhamento",
      reevaluation: "Reavaliação",
      parent_meeting: "Reunião com pais",
      report_delivery: "Entrega de relatório",
    };
    return labels[type] || type;
  };

  const isLoading = loadingUpcoming || loadingToday;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8fb] via-[#e8edf5] to-[#dce5f0] p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tarefas</h1>
            <p className="text-gray-600 mt-1">
              Gerencie suas tarefas e visualize sugestões da IA
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - AI Cards */}
            <div className="lg:col-span-1 space-y-6">
              {/* AI Suggestion 1 */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-white text-2xl">
                        psychology
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Sugestão da IA
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        Considere agendar uma reunião com os pais do paciente João Silva
                        para discutir o progresso terapêutico.
                      </p>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                          Agendar
                        </button>
                        <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                          Ignorar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Suggestion 2 */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-white text-2xl">
                        description
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Relatório Pendente
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        O relatório mensal de Maria Santos está pendente há 5 dias.
                        Recomendo priorizar sua finalização.
                      </p>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          Criar agora
                        </button>
                        <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                          Lembrar depois
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Suggestion 3 */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-white text-2xl">
                        calendar_month
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Otimização de Agenda
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        Você tem 3 horários vagos na quinta-feira. Que tal entrar em contato
                        com pacientes na lista de espera?
                      </p>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                          Ver lista
                        </button>
                        <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                          Mais tarde
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Tasks & Reminders */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Add Task */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-gray-400 text-2xl">
                    add_circle
                  </span>
                  <input
                    type="text"
                    placeholder="Adicionar nova tarefa..."
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && taskInput.trim()) {
                        // TODO: Implementar criação de tarefa
                        setTaskInput("");
                      }
                    }}
                  />
                  <button className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all">
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Próximos Agendamentos */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">
                    Próximos Agendamentos
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {nextAppointments.length} agendamentos confirmados
                  </p>
                </div>

                <div className="divide-y divide-gray-100">
                  {nextAppointments.length === 0 && (
                    <div className="p-8 text-center">
                      <span className="material-symbols-outlined text-gray-300 text-5xl mb-3 block">
                        event_available
                      </span>
                      <p className="text-gray-500">
                        Nenhum agendamento encontrado
                      </p>
                    </div>
                  )}

                  {nextAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="p-5 hover:bg-white/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-primary text-2xl">
                            person
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {appointment.patientName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getAppointmentTypeLabel(appointment.type)} •{" "}
                            {appointment.duration} min
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatTime(appointment.dateTime)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(appointment.dateTime)}
                            </div>
                          </div>

                          {appointment.status === "confirmed" && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Confirmado
                            </span>
                          )}
                          {appointment.status === "scheduled" && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Agendado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient Reminders */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">
                    Lembretes de Pacientes
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Agendamentos para hoje
                  </p>
                </div>

                <div className="divide-y divide-gray-100">
                  {Object.keys(appointmentsByDate).length === 0 && (
                    <div className="p-8 text-center">
                      <span className="material-symbols-outlined text-gray-300 text-5xl mb-3 block">
                        notifications_none
                      </span>
                      <p className="text-gray-500">
                        Nenhum agendamento para hoje
                      </p>
                    </div>
                  )}

                  {Object.entries(appointmentsByDate).map(([date, appointments]) => (
                    <div key={date} className="p-5">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        {date}
                      </div>
                      <div className="space-y-3">
                        {appointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors"
                          >
                            <div className="size-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-blue-600 text-xl">
                                schedule
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {appointment.patientName}
                              </h4>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {formatTime(appointment.dateTime)} •{" "}
                                {getAppointmentTypeLabel(appointment.type)}
                              </p>
                              {appointment.notes && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                  {appointment.notes}
                                </p>
                              )}
                            </div>

                            <button className="flex-shrink-0 size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                              <span className="material-symbols-outlined text-gray-400 text-lg">
                                more_vert
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
