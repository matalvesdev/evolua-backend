"use client"

import Image from 'next/image'

export function DashboardHeader() {
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
        <p className="text-xs text-gray-500">Quinta, 24 de Outubro</p>
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
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="h-8 w-px bg-gray-300 mx-1"></div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-800 leading-tight">Dra. Camila</p>
            <p className="text-[11px] text-primary font-bold uppercase tracking-wide">Fonoaudióloga</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-linear-to-tr from-purple-400 to-primary p-0.5">
            <Image
              alt="Avatar"
              className="rounded-full h-full w-full object-cover border border-white"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2KPblk46KwFdISsMpPH2vgNjtrqpVcHWOqiSWrdFLGkTYIlSr4vxk3cfAYPaZYa86BKcoacNdAMEPKfYVdVgFud_DqtMNh4kZm9dMWE37O-IYba-Bz6buYiH21pRj8G6WsGkMQWtFiNt_DJmOzxwdEKJZltrVAEdhE3itEmRKHlDIsCI7GIirsYtPgRMvopsWVpWb4mio0CSldzdPVfQ6vYLWwB8kF6uhDVlcGH2duwQmIWggQwWkzjKBjLosC3re1AFs1Hqhj83b"
              width={40}
              height={40}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
