'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppointmentProgressBar,
  PatientSearchInput,
  DatePickerCalendar,
  TimeSlotGrid,
  AppointmentOptions,
  AppointmentSummary,
} from '@/components/appointment-booking';

interface Patient {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// Mock data - Replace with actual data from Supabase
const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Ana Souza',
    email: 'ana.souza@email.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBl8G29SjptaNhkbAzIp7H0eonr_RO8l8W0ZmRdTXeD0r1gXYkQ-44vRnO4CoMQrcknC67vQA_a1F06Hk7YjpJJLdLLnz7icSR_fJBQ3Jt-EWLB9YgBbxlZWTEShvoeBzteu2M8wdr7kXk931m_HhOg0QUsGKW7Oebdoehg24GSnZ8X3LV8wQhq2XZqk0vU5Ig3jVkK_hILOrZDCqrxILgGext2xJL2AmR1Jd9RN5eqpZqClCFxBvJz27VxWQ3xGQPeSRMxdBA88VGb',
  },
  {
    id: '2',
    name: 'Carlos Lima',
    email: 'carlos.lima@email.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxa5FU70GGvSbf3g7tEtMcqnDw_-LBzJ5edwiiv4j8iYY6EkZetAI-4X8_HqWWffylqm6v7XkC9C2heNfDy8idkAmaZnKgEFM-a9CnN9LTg6yV6R-4PIckH3-E6_VrEP3A5lPf_hdZvww2r56-FxamwGg1McVOeWbOcJS_rGQr1aA2XU7QmafoWFqWS43cagovf6r627HGfPk6mGMN56-4jvfPMI-pxhOM4Ub4HU1OgwXOwamavSWB9mBBF3BX6obZHF0svOlz6mH5',
  },
  {
    id: '3',
    name: 'Beatriz Martins',
    email: 'beatriz.m@email.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC18muCJkJILRi4Xn45HOXNgBOaQM0L-ZV-g4tcEhhuBSJkXG4-Y6aksJPt4BKVmVqjwIURx2CC7f0gv4l3JANTnJ8JesRLhtCD5ZFTYLZOGAyo6zVmfmh9Ws6B84SZJXnpqkZiH2FeWIXLLQ4qB2V_e2beSTD3yzHw7qUk5knxCQkFctdMm4QKbVoH5HNf3C3lhReEM2Xf1rZrVYHI7H82s0KK6xh25Hgc0S_VrjwK-gKlQaCKp_LDzn6leW_V8ZPw7LShBmcgc2MK',
  },
];

const mockTimeSlots: TimeSlot[] = [
  { time: '08:00', available: false },
  { time: '09:00', available: true },
  { time: '10:00', available: true },
  { time: '11:00', available: true },
  { time: '13:30', available: true },
  { time: '14:30', available: true },
  { time: '15:00', available: true },
  { time: '16:00', available: true },
];

export default function NovoAgendamentoPage() {
  const router = useRouter();

  // Form state
  const [currentStep] = useState(2); // Steps: 1=Paciente, 2=Detalhes, 3=Revisão
  const [searchValue, setSearchValue] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2023, 10, 5)); // Nov 5, 2023
  const [selectedTime, setSelectedTime] = useState<string | null>('10:00');
  const [mode, setMode] = useState<'online' | 'presencial'>('online');
  const [duration, setDuration] = useState<'30m' | '50m' | '1h'>('50m');

  // Calendar navigation
  const [currentMonth, setCurrentMonth] = useState(new Date(2023, 10, 1)); // Nov 2023

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleCancel = () => {
    router.push('/dashboard/agendamentos');
  };

  const handleConfirm = () => {
    if (!selectedPatient || !selectedDate || !selectedTime) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    console.log('Booking appointment:', {
      patient: selectedPatient,
      date: selectedDate,
      time: selectedTime,
      mode,
      duration,
    });

    // TODO: Save to Supabase
    // await createAppointment({ ... });

    router.push('/dashboard/agendamentos');
  };

  const isFormValid =
    selectedPatient !== null && selectedDate !== null && selectedTime !== null;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#fbf8fd] to-transparent dark:from-[#2a1b33] dark:to-transparent -z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-[#820AD1]/5 to-transparent -z-10 pointer-events-none opacity-50" />

      <div className="max-w-5xl mx-auto flex flex-col gap-8 h-full">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-2">
          <h1 className="text-2xl font-bold text-[#161118] dark:text-white">
            Agendar Sessão
          </h1>
          <AppointmentProgressBar currentStep={currentStep} />
        </div>

        {/* Main Form Card */}
        <div className="glass-card rounded-2xl p-8 shadow-xl shadow-[#820AD1]/5 flex flex-col gap-8">
          {/* Patient Search */}
          <PatientSearchInput
            value={searchValue}
            onChange={setSearchValue}
            onPatientSelect={handlePatientSelect}
            patients={mockPatients}
          />

          <hr className="border-[#f3f0f4] dark:border-white/5" />

          {/* Date & Time Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Date Picker */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <DatePickerCalendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                currentMonth={currentMonth}
                onPreviousMonth={handlePreviousMonth}
                onNextMonth={handleNextMonth}
              />
            </div>

            {/* Time Slots & Options */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <TimeSlotGrid
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onTimeSelect={setSelectedTime}
                availableSlots={mockTimeSlots}
              />

              <AppointmentOptions
                mode={mode}
                duration={duration}
                onModeChange={setMode}
                onDurationChange={setDuration}
              />
            </div>
          </div>

          {/* Summary & Actions */}
          <AppointmentSummary
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            mode={mode}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            isValid={isFormValid}
          />
        </div>
      </div>
    </div>
  );
}
