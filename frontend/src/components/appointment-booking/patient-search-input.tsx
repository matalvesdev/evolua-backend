import React, { useState } from 'react';

interface Patient {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface PatientSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onPatientSelect: (patient: Patient) => void;
  patients: Patient[];
}

export function PatientSearchInput({
  value,
  onChange,
  onPatientSelect,
  patients,
}: PatientSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(value.toLowerCase())
  );

  const handleSelect = (patient: Patient) => {
    onPatientSelect(patient);
    onChange(patient.name);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-bold text-[#161118] dark:text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-[#820AD1] text-lg">
          person_search
        </span>
        Buscar Paciente
      </label>
      <div className="relative group max-w-lg">
        <input
          className="w-full bg-white dark:bg-black/20 border-0 rounded-xl px-4 py-3 pl-11 shadow-sm ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-[#820AD1] placeholder:text-gray-400 text-sm transition-all"
          placeholder="Digite o nome do paciente..."
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">
          search
        </span>

        {/* Dropdown */}
        {isOpen && filteredPatients.length > 0 && (
          <div className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-[#2d1b36] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 p-2 z-10 max-h-64 overflow-y-auto">
            {filteredPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => handleSelect(patient)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#f3f0f4] dark:hover:bg-white/5 text-left transition-colors"
              >
                <div
                  className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8"
                  style={{ backgroundImage: `url(${patient.avatar})` }}
                />
                <div>
                  <p className="text-sm font-bold text-[#161118] dark:text-white">
                    {patient.name}
                  </p>
                  <p className="text-[10px] text-gray-500">{patient.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
