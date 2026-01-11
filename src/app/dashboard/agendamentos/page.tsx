'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

// Mock data - Replace with actual data from Supabase
const mockAppointments: Appointment[] = [
  {
    id: '1',
    patientName: 'Ana Souza',
    patientAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBl8G29SjptaNhkbAzIp7H0eonr_RO8l8W0ZmRdTXeD0r1gXYkQ-44vRnO4CoMQrcknC67vQA_a1F06Hk7YjpJJLdLLnz7icSR_fJBQ3Jt-EWLB9YgBbxlZWTEShvoeBzteu2M8wdr7kXk931m_HhOg0QUsGKW7Oebdoehg24GSnZ8X3LV8wQhq2XZqk0vU5Ig3jVkK_hILOrZDCqrxILgGext2xJL2AmR1Jd9RN5eqpZqClCFxBvJz27VxWQ3xGQPeSRMxdBA88VGb',
    startTime: '09:00',
    endTime: '10:00',
    therapyType: 'Terapia Cognitiva',
    status: 'completed',
  },
  {
    id: '2',
    patientName: 'Carlos Lima',
    patientAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxa5FU70GGvSbf3g7tEtMcqnDw_-LBzJ5edwiiv4j8iYY6EkZetAI-4X8_HqWWffylqm6v7XkC9C2heNfDy8idkAmaZnKgEFM-a9CnN9LTg6yV6R-4PIckH3-E6_VrEP3A5lPf_hdZvww2r56-FxamwGg1McVOeWbOcJS_rGQr1aA2XU7QmafoWFqWS43cagovf6r627HGfPk6mGMN56-4jvfPMI-pxhOM4Ub4HU1OgwXOwamavSWB9mBBF3BX6obZHF0svOlz6mH5',
    startTime: '10:30',
    endTime: '11:30',
    therapyType: 'Retorno',
    status: 'scheduled',
  },
  {
    id: '3',
    patientName: 'Beatriz M.',
    patientAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC18muCJkJILRi4Xn45HOXNgBOaQM0L-ZV-g4tcEhhuBSJkXG4-Y6aksJPt4BKVmVqjwIURx2CC7f0gv4l3JANTnJ8JesRLhtCD5ZFTYLZOGAyo6zVmfmh9Ws6B84SZJXnpqkZiH2FeWIXLLQ4qB2V_e2beSTD3yzHw7qUk5knxCQkFctdMm4QKbVoH5HNf3C3lhReEM2Xf1rZrVYHI7H82s0KK6xh25Hgc0S_VrjwK-gKlQaCKp_LDzn6leW_V8ZPw7LShBmcgc2MK',
    startTime: '14:00',
    endTime: '15:00',
    therapyType: 'Terapia de Casal',
    status: 'completed',
  },
];

// Generate calendar days
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
    const appointmentCount = isToday ? 2 : [2, 6, 9, 13, 17, 20].includes(day) ? 1 : 0;
    
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
    console.log('Day clicked:', date);
    // TODO: Navigate to day view or show appointments for selected day
  };
  
  const handleFilterClick = () => {
    console.log('Filters clicked');
    // TODO: Open filters modal
  };
  
  const handleViewAll = () => {
    console.log('View all appointments');
    // TODO: Navigate to full appointments list
  };
  
  const handleAddAppointment = () => {
    router.push('/dashboard/agendamentos/novo');
  };
  
  const handleStartSession = (appointmentId: string) => {
    console.log('Start session:', appointmentId);
    // TODO: Navigate to session start page
  };
  
  const handleViewDetails = (appointmentId: string) => {
    console.log('View details:', appointmentId);
    // TODO: Open appointment details modal or navigate to details page
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
