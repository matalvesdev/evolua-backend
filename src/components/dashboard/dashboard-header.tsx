"use client"

import Image from 'next/image'
import { useUser } from '@/hooks'

export function DashboardHeader() {
  const { user } = useUser()
  
  const today = new Date()
  const dateStr = today.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <header className="h-20 px-6 lg:px-10 flex items-center justify-between bg-white/30 backdrop-blur-sm sticky top-0 z-40 border-b border-white/40">
      {/* Mobile menu */}
      <div className="flex items-center gap-3 md:hidden">
        <button className="p-2 -ml-2 text-gray-600">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="text-lg font-bold text-primary">Evolua</span>
      </div>

      {/* Page title */}
      <div className="hidden md:flex flex-col mr-auto">
        <h2 className="text-sm font-bold text-gray-800">Visão Geral</h2>
        <p className="text-xs text-gray-500">{formattedDate}</p>
      </div>

      {/* Search */}
      <div className="hidden lg:flex items-center max-w-md w-full mx-6">
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input
            className="block w-full pl-10 pr-3 py-2 border-0 bg-white/50 backdrop-blur-sm rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all duration-300 font-display text-sm shadow-sm"
            placeholder="Pesquisar pacientes, relatórios..."
            type="text"
          />
        </div>
      </div>

      {/* User menu */}
      <div className="flex items-center gap-4">
        <button className="relative p-2.5 bg-white rounded-full text-gray-400 hover:text-primary hover:shadow-md transition-all">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <div className="flex items-center gap-3 md:pl-3">
          <div className="hidden md:block text-right">
            <p className="text-sm font-bold text-gray-800">{user?.name || 'Usuário'}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">
              {user?.role === 'therapist' ? 'FONOAUDIÓLOGO/A' : 'PROFISSIONAL'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold shadow-md">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}
