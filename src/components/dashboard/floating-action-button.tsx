"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface FABAction {
  icon: string
  label: string
  href: string
}

const fabActions: FABAction[] = [
  { icon: "person_add", label: "Novo Paciente", href: "/dashboard/pacientes/novo" },
  { icon: "event", label: "Agendar", href: "/dashboard/agendamentos/novo" },
]

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  return (
    <div
      className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 group flex flex-col-reverse items-end gap-4"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="h-16 w-16 bg-gray-900 hover:bg-black text-white rounded-full shadow-2xl shadow-gray-900/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 group-hover:rotate-45">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
      <div
        className={`flex flex-col items-end gap-3 transition-all duration-300 ${
          isOpen ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-10 scale-90 pointer-events-none"
        }`}
      >
        {fabActions.map((action) => (
          <button 
            key={action.label} 
            className="flex items-center gap-3 group/item" 
            onClick={() => router.push(action.href)}
          >
            <span className="bg-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm text-gray-700 group-hover/item:text-primary transition-colors">
              {action.label}
            </span>
            <div className="h-10 w-10 bg-white rounded-full text-primary shadow-lg flex items-center justify-center hover:bg-purple-50 transition-colors">
              <span className="material-symbols-outlined text-xl">{action.icon}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
