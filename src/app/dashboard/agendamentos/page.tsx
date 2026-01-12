'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarHeader,
  CalendarMonthView,
  TodayAppointmentsSidebar,
} from '@/components/calendar';
import { useTodayAppointments, useWeekAppointments } from '@/hooks';
import { Appointment as CoreAppointment } from '@/lib/core/domain/entities/appointment';

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

// Convert Core Appointment to UI Appointment
const convertAppointment = (coreAppointment: CoreAppointment): Appointment => {
  const startDate = new Date(coreAppointment.dateTime);
  const endDate = new Date(startDate.getTime() + coreAppointment.duration * 60000);
  
  return {
    id: coreAppointment.id,
    patientName: coreAppointment.patientName,
    patientAvatar: '', // Default avatar - can be enhanced later
    startTime: startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    endTime: endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    therapyType: coreAppointment.type,
    status: coreAppointment.status === 'completed' ? 'completed' : 
            coreAppointment.status === 'scheduled' || coreAppointment.status === 'confirmed' ? 'scheduled' : 
            'pending',
  };
};

// Generate calendar days
const generateCalendarDays = (
  year: number, 
  month: number,
  weekAppointments: CoreAppointment[]
): CalendarDay[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const days: CalendarDay[] = [];
  
  // Count appointments by day
  const appointmentsByDay = new Map<string, number>();
  weekAppointments.forEach(apt => {
    const aptDate = new Date(apt.dateTime);
    const key = `${aptDate.getFullYear()}-${aptDate.getMonth()}-${aptDate.getDate()}`;
    appointmentsByDay.set(key, (appointmentsByDay.get(key) || 0) + 1);
  });
  
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
    const dateKey = `${year}-${month}-${day}`;
    const appointmentCount = appointmentsByDay.get(dateKey) || 0;
    
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
  
  // Fetch today's appointments
  const { appointments: todayAppointments, loading: todayLoading } = useTodayAppointments();
  
  // Fetch week appointments for calendar
  const weekStartDate = useMemo(() => {
    const start = new Date(year, month, 1);
    return start;
  }, [year, month]);
  
  const { appointments: weekAppointments } = useWeekAppointments(weekStartDate);
  
  // Convert appointments for UI
  const uiAppointments = useMemo(() => 
    todayAppointments.map(convertAppointment),
    [todayAppointments]
  );
  
  // Generate calendar days with real appointment counts
  const calendarDays = useMemo(() => 
    generateCalendarDays(year, month, weekAppointments),
    [year, month, weekAppointments]
  );
  
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
    // Navigate to appointments list filtered by selected date
    const dateStr = date.toISOString().split('T')[0]
    router.push(`/dashboard/agendamentos?view=list&date=${dateStr}`)
  };
  
  const handleFilterClick = () => {
    // Toggle to list view with filters
    router.push('/dashboard/agendamentos?view=list')
  };
  
  const handleViewAll = () => {
    // Navigate to full appointments list
    router.push('/dashboard/agendamentos?view=list')
  };
  
  const handleAddAppointment = () => {
    router.push('/dashboard/agendamentos/novo');
  };
  
  const handleStartSession = (appointmentId: string) => {
    // Navigate to session/consultation page
    router.push(`/dashboard/agendamentos/${appointmentId}/sessao`)
  };
  
  const handleViewDetails = (appointmentId: string) => {
    // Navigate to appointment details page
    router.push(`/dashboard/agendamentos/${appointmentId}`)
  };
  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: 'short' 
  });

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
              date={todayFormatted}
              appointments={uiAppointments}
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
