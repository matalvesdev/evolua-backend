'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CalendarHeader,
  CalendarMonthView,
  TodayAppointmentsSidebar,
} from '@/components/calendar';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointmentCount: number;
  date: Date;
}

interface Appointment {
  id: string;
  patientName: string;
  patientAvatar: string;
  startTime: string;
  endTime: string;
  therapyType: string;
  status: 'completed' | 'scheduled' | 'pending';
}

// TODO: Fetch from Supabase
const mockAppointments: Appointment[] = [];

// Generate calendar days for November 2023
const generateCalendarDays = (year: number, month: number): CalendarDay[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const days: CalendarDay[] = [];
  
  // Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: false,
      appointmentCount: 0,
      date: new Date(year, month - 1, prevMonthLastDay - i),
    });
  }
  
  // Current month days
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && today.getDate() === day;
    // TODO: Fetch actual appointment count from Supabase
    const appointmentCount = 0;
    
    days.push({
      day,
      isCurrentMonth: true,
      isToday,
      appointmentCount,
      date: new Date(year, month, day),
    });
  }
  
  return days;
};

export default function AgendamentosPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
  
  const calendarDays = generateCalendarDays(year, month);
  
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const handleTodayClick = () => {
    setCurrentDate(new Date());
  };
  
  const handleDayClick = (date: Date) => {
    // TODO: Implement day view navigation
    console.log('Day clicked:', date);
  };
  
  const handleFilterClick = () => {
    // TODO: Implement filters modal
    console.log('Filters clicked');
  };
  
  const handleViewAll = () => {
    // TODO: Implement full appointments list view
    console.log('View all appointments');
  };
  
  const handleAddAppointment = () => {
    router.push('/dashboard/agendamentos/novo');
  };
  
  const handleStartSession = (appointmentId: string) => {
    // TODO: Implement session start flow
    console.log('Start session:', appointmentId);
  };
  
  const handleViewDetails = (appointmentId: string) => {
    // TODO: Implement appointment details view
    console.log('View details:', appointmentId);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 relative scroll-smooth">
      {/* Background Gradient */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-br from-purple-100/40 via-blue-50/20 to-transparent dark:from-purple-900/10 dark:via-blue-900/5 dark:to-transparent -z-10 pointer-events-none" />
      
      <div className="max-w-[1400px] mx-auto flex flex-col gap-8">
        <CalendarHeader
          currentView={currentView}
          onViewChange={setCurrentView}
          onFilterClick={handleFilterClick}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full">
            <CalendarMonthView
              month={monthName}
              year={year}
              days={calendarDays}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onTodayClick={handleTodayClick}
              onDayClick={handleDayClick}
            />
          </div>
          
          {/* Today's Appointments Sidebar */}
          <div className="lg:col-span-4 xl:col-span-3">
            <TodayAppointmentsSidebar
              date="Quinta-feira, 05 Nov"
              appointments={mockAppointments}
              onViewAll={handleViewAll}
              onAddAppointment={handleAddAppointment}
              onStartSession={handleStartSession}
              onViewDetails={handleViewDetails}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentActions({
  status,
  onConfirm,
  onStart,
  onComplete,
  onCancel,
}: {
  id: string
  status: string
  onConfirm: () => void
  onStart: () => void
  onComplete: () => void
  onCancel: () => void
}) {
  if (status === "scheduled") {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onConfirm} className="text-xs sm:text-sm">
          Confirmar
        </Button>
        <Button size="sm" variant="outline" className="text-red-600 text-xs sm:text-sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    )
  }

  if (status === "confirmed") {
    return (
      <div className="flex gap-2">
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm" onClick={onStart}>
          Iniciar
        </Button>
        <Button size="sm" variant="outline" className="text-red-600 text-xs sm:text-sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    )
  }

  if (status === "in-progress") {
    return (
      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm" onClick={onComplete}>
        Finalizar
      </Button>
    )
  }

  return null
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    scheduled: { label: "Agendado", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    confirmed: { label: "Confirmado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    "in-progress": { label: "Em andamento", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    completed: { label: "Concluído", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
    cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
    "no-show": { label: "Não compareceu", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  }

  const config = statusConfig[status] ?? { label: status, color: "bg-gray-100 text-gray-800" }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}

function formatType(type: string): string {
  const types: Record<string, string> = {
    regular: "Sessão Regular",
    evaluation: "Avaliação",
    reevaluation: "Reavaliação",
    discharge: "Alta",
  }
  return types[type] ?? type
}
