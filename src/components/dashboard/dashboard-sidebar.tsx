"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogoutButton } from "./logout-button"

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/dashboard/pacientes", icon: "groups", label: "Pacientes" },
  { href: "/dashboard/agendamentos", icon: "calendar_month", label: "Agenda" },
  { href: "/dashboard/financeiro", icon: "payments", label: "Financeiro" },
  { href: "/dashboard/relatorios", icon: "description", label: "Relatórios" },
  { href: "/dashboard/tarefas", icon: "check_circle", label: "Tarefas" },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-20 lg:w-64 h-full bg-white/80 backdrop-blur-md border-r border-white z-50 hidden md:flex flex-col justify-between transition-all duration-300">
      <div>
        {/* Logo */}
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-100/50">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <span className="material-symbols-outlined text-xl">graphic_eq</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden lg:block tracking-tight">Evolua</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 p-4 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-purple-50 text-primary font-medium"
                    : "text-gray-500 hover:bg-gray-50 hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="hidden lg:block">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 space-y-2">
        <Link
          href="/dashboard/perfil"
          className="flex items-center gap-3 p-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-primary transition-colors w-full"
        >
          <span className="material-symbols-outlined">person</span>
          <span className="hidden lg:block font-medium">Perfil</span>
        </Link>
        <LogoutButton />
      </div>
    </aside>
  )
}
