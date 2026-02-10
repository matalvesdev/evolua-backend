import React from 'react';

interface Step {
  number: number;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}

interface AppointmentProgressBarProps {
  currentStep: number;
}

export function AppointmentProgressBar({ currentStep }: AppointmentProgressBarProps) {
  const steps: Step[] = [
    { number: 1, label: 'Paciente', isActive: currentStep >= 1, isCompleted: currentStep > 1 },
    { number: 2, label: 'Detalhes', isActive: currentStep >= 2, isCompleted: currentStep > 2 },
    { number: 3, label: 'Revisão', isActive: currentStep >= 3, isCompleted: currentStep > 3 },
  ];

  return (
    <div className="flex items-center w-full max-w-md gap-4 mt-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex items-center gap-2">
            <div
              className={`size-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step.isActive
                  ? 'bg-[#820AD1] text-white'
                  : 'border-2 border-gray-300 text-gray-400'
              }`}
            >
              {step.number}
            </div>
            <span
              className={`text-xs font-bold transition-all ${
                step.isActive ? 'text-[#820AD1]' : 'text-gray-400 font-medium'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`h-[2px] flex-1 transition-all ${
                step.isCompleted ? 'bg-[#820AD1]' : 'bg-[#820AD1]/20'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
