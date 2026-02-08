"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { AiChatFab } from "@/components/dashboard/ai-chat-fab"
import { useRequireAuth } from "@/hooks/use-auth"

const mobileNavItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/dashboard/pacientes", icon: "groups", label: "Pacientes" },
  { href: "/dashboard/agendamentos", icon: "calendar_month", label: "Agenda" },
  { href: "/dashboard/tarefas", icon: "check_circle", label: "Tarefas" },
  { href: "/dashboard/financeiro", icon: "payments", label: "Financeiro" },
  { href: "/dashboard/relatorios", icon: "description", label: "Relatórios" },
]

function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-panel rounded-none border-t border-white/60" style={{ borderRadius: 0 }}>
      <div className="flex items-center justify-around px-1 py-2">
        {mobileNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-12 min-h-11 px-2 py-1 rounded-xl transition-colors ${
                isActive
                  ? "text-[#8A05BE]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}
              >
                {item.icon}
              </span>
              <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#8A05BE]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth()

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-page">
        <div className="animate-pulse text-gray-400">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return null // useRequireAuth will redirect to login
  }

  return (
    <div className="bg-bg-page font-display text-gray-800 overflow-hidden h-screen w-screen flex relative">
      {/* Orbes de fundo */}
      <div className="w-96 h-96 rounded-full blur-[80px] absolute" style={{ top: '-100px', left: '-100px', background: 'rgba(138, 5, 190, 0.15)' }} />
      <div className="rounded-full blur-[80px] absolute" style={{ width: '500px', height: '500px', bottom: '-100px', right: '-100px', background: 'rgba(168, 85, 247, 0.12)' }} />
      <div className="w-64 h-64 rounded-full blur-[80px] absolute" style={{ top: '20%', right: '30%', background: 'rgba(109, 8, 175, 0.1)' }} />
      
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden pb-16 md:pb-0">
        {children}
      </div>

      {/* Mobile bottom navigation - visible only below md breakpoint */}
      <MobileBottomNav />

      {/* AI Chat floating button */}
      <AiChatFab />
    </div>
  );
}
