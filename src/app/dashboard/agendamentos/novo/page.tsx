'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppointmentProgressBar,
  PatientSearchInput,
  DatePickerCalendar,
  TimeSlotGrid,
  AppointmentOptions,
  AppointmentSummary,
} from '@/components/appointment-booking';
import { usePatients, useAppointmentMutations, useAppointments, useUser } from '@/hooks';
import { Appointment as CoreAppointment } from '@/lib/core/domain/entities/appointment';

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

// Generate time slots from 8:00 to 18:00 in 30-minute intervals
const generateTimeSlots = (selectedDate: Date | null, existingAppointments: CoreAppointment[]): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  
  if (!selectedDate) return slots;
  
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break; // Stop at 18:00
      
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Check if this time slot conflicts with existing appointments
      const slotDateTime = new Date(selectedDate);
      slotDateTime.setHours(hour, minute, 0, 0);
      
      const isAvailable = !existingAppointments.some(apt => {
        const aptStart = new Date(apt.dateTime);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        const slotEnd = new Date(slotDateTime.getTime() + 30 * 60000); // 30 min slot
        
        // Check if slot overlaps with appointment
        return (slotDateTime >= aptStart && slotDateTime < aptEnd) ||
               (slotEnd > aptStart && slotEnd <= aptEnd) ||
               (slotDateTime <= aptStart && slotEnd >= aptEnd);
      });
      
      slots.push({
        time,
        available: isAvailable,
      });
    }
  }
  return slots;
};

export default function NovoAgendamentoPage() {
  const router = useRouter();

  // Form state
  const [currentStep] = useState(2); // Steps: 1=Paciente, 2=Detalhes, 3=Revisão
  const [searchValue, setSearchValue] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [mode, setMode] = useState<'online' | 'presencial'>('online');
  const [duration, setDuration] = useState<'30m' | '50m' | '1h'>('50m');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch patients from Supabase
  const { patients: allPatients, loading: patientsLoading } = usePatients();
  const { createAppointment, isCreating: createLoading } = useAppointmentMutations();
  const { user } = useUser();
  
  // Fetch appointments for selected date to check availability
  const dateFilter = useMemo(() => {
    if (!selectedDate) return {};
    const dateStr = selectedDate.toISOString().split('T')[0];
    return {
      startDate: dateStr,
      endDate: dateStr,
    };
  }, [selectedDate]);
  
  const { appointments: dayAppointments } = useAppointments(dateFilter);

  // Convert Supabase patients to UI format
  const uiPatients: Patient[] = allPatients.map(patient => ({
    id: patient.id,
    name: patient.name,
    email: patient.email || '',
    avatar: '', // Default avatar
  }));

  // Generate time slots with availability check
  const timeSlots = useMemo(() => 
    generateTimeSlots(selectedDate, dayAppointments as unknown as CoreAppointment[]),
    [selectedDate, dayAppointments]
  );

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

  const handleConfirm = async () => {
    if (!selectedPatient || !selectedDate || !selectedTime) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Parse time and create datetime
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    // Parse duration
    const durationMap = {
      '30m': 30,
      '50m': 50,
      '1h': 60,
    };

    const durationMinutes = durationMap[duration];

    try {
      await createAppointment({
        patientId: selectedPatient.id,
        dateTime: appointmentDateTime.toISOString(),
        duration: durationMinutes,
        type: 'regular',
        therapistId: user?.id || '',
      });
      router.push('/dashboard/agendamentos');
    } catch (err) {
      alert('Erro ao criar agendamento: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };

  const isFormValid =
    selectedPatient !== null && selectedDate !== null && selectedTime !== null;

  const isLoading = patientsLoading || createLoading;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-linear-to-b from-[#fbf8fd] to-transparent dark:from-[#2a1b33] dark:to-transparent -z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 w-1/3 h-full bg-linear-to-l from-[#820AD1]/5 to-transparent -z-10 pointer-events-none opacity-50" />
      
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
            patients={uiPatients}
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
                availableSlots={timeSlots}
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
            isValid={isFormValid && !isLoading}
          />
        </div>
      </div>
    </div>
  );
}

