import React from 'react';
import { AppointmentCard } from './appointment-card';

interface Appointment {
  id: string;
  patientName: string;
  patientAvatar: string;
  startTime: string;
  endTime: string;
  therapyType: string;
  status: 'completed' | 'scheduled' | 'pending';
}

interface TodayAppointmentsSidebarProps {
  date: string;
  appointments: Appointment[];
  onViewAll: () => void;
  onAddAppointment: () => void;
  onStartSession: (appointmentId: string) => void;
  onViewDetails: (appointmentId: string) => void;
}

export function TodayAppointmentsSidebar({
  date,
  appointments,
  onViewAll,
  onAddAppointment,
  onStartSession,
  onViewDetails,
}: TodayAppointmentsSidebarProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 h-full flex flex-col sticky top-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[#161118] dark:text-white leading-tight">
          Atendimentos <br />
          <span className="text-[#820AD1]">de Hoje</span>
        </h3>
        <button 
          onClick={onViewAll}
          className="size-8 flex items-center justify-center rounded-full bg-white dark:bg-white/10 text-gray-400 hover:text-[#820AD1] hover:bg-[#820AD1]/5 transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            arrow_forward
          </span>
        </button>
      </div>

      {/* Appointments List */}
      <div className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 -mr-2">
        <div className="text-sm font-semibold text-gray-400 mb-2">{date}</div>
        
        {appointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            id={appointment.id}
            patientName={appointment.patientName}
            patientAvatar={appointment.patientAvatar}
            startTime={appointment.startTime}
            endTime={appointment.endTime}
            therapyType={appointment.therapyType}
            status={appointment.status}
            onStartSession={
              appointment.status === 'completed' 
                ? () => onStartSession(appointment.id) 
                : undefined
            }
            onViewDetails={
              appointment.status !== 'completed' 
                ? () => onViewDetails(appointment.id) 
                : undefined
            }
          />
        ))}

        {/* Add Extra Appointment */}
        <button 
          onClick={onAddAppointment}
          className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#820AD1] hover:border-[#820AD1]/50 hover:bg-[#820AD1]/5 transition-all group"
        >
          <span className="material-symbols-outlined group-hover:scale-110 transition-transform">
            add_circle
          </span>
          <span className="text-xs font-bold">Adicionar Horário Extra</span>
        </button>
      </div>
    </div>
  );
}
