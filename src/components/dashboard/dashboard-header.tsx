"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks"
import { useAuth } from "@/hooks/use-auth"
import { NotificationPanel, useNotifications } from "./notification-panel"
import { listPatients } from "@/lib/api/patients"
import { listReports } from "@/lib/api/reports"

interface SearchResult {
  id: string
  type: "patient" | "report"
  title: string
  subtitle: string
  icon: string
  href: string
}

export function DashboardHeader() {
  const router = useRouter()
  const { user } = useUser()
  const { logout } = useAuth()
  const { unreadCount } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)

  // Search state
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Profile dropdown
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const userName = (user?.user_metadata?.name || user?.user_metadata?.full_name || "Usuário") as string
  const userRole = user?.user_metadata?.role === "therapist" ? "Fonoaudiólogo(a)" : "Profissional"
  const userInitial = userName.charAt(0).toUpperCase()

  // Search logic
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    try {
      const [patientsRes, reportsRes] = await Promise.all([
        listPatients({ search: q, limit: 5 }),
        listReports({ search: q, limit: 5 }),
      ])
      const items: SearchResult[] = []
      patientsRes.data.forEach((p) => {
        items.push({
          id: p.id,
          type: "patient",
          title: p.name,
          subtitle: p.email || p.phone || `Status: ${p.status}`,
          icon: "person",
          href: `/dashboard/pacientes/${p.id}`,
        })
      })
      reportsRes.data.forEach((r) => {
        items.push({
          id: r.id,
          type: "report",
          title: r.title || "Relatório sem título",
          subtitle: `${r.patientName} • ${r.type}`,
          icon: "description",
          href: `/dashboard/pacientes/${r.patientId}/revisar-relatorio?reportId=${r.id}`,
        })
      })
      setResults(items)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setQuery(value)
    setShowResults(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  // Close search on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Close profile on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false)
    setQuery("")
    setResults([])
    router.push(result.href)
  }

  const handleLogout = async () => {
    setProfileOpen(false)
    await logout()
  }

  return (
    <header className="glass-panel h-20 px-6 lg:px-10 flex items-center justify-between sticky top-0 z-40 rounded-none border-t-0 border-x-0">
      {/* Mobile menu */}
      <div className="flex items-center gap-3 md:hidden">
        <button className="p-2 -ml-2 text-gray-600 hover:text-[#8A05BE] transition-colors">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="text-lg font-bold text-[#8A05BE]">Evolua</span>
      </div>

      {/* Search */}
      <div ref={searchRef} className="hidden md:flex items-center max-w-md w-full relative">
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {searching ? (
              <span className="material-symbols-outlined text-[#8A05BE] animate-spin text-lg">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#8A05BE] transition-colors">search</span>
            )}
          </div>
          <input
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 bg-white backdrop-blur-sm rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all duration-300 font-(--font-sans) text-sm shadow-sm"
            placeholder="Pesquisar pacientes, relatórios..."
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => { if (query.trim().length >= 2) setShowResults(true) }}
          />
        </div>

        {/* Search results dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
            {query.trim().length < 2 ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-2xl text-gray-300 mb-1 block">search</span>
                <p className="text-sm text-gray-400">Digite para pesquisar...</p>
              </div>
            ) : results.length === 0 && !searching ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-2xl text-gray-300 mb-1 block">search_off</span>
                <p className="text-sm text-gray-400">Nenhum resultado encontrado</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                {results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleResultClick(r)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${r.type === "patient" ? "bg-purple-100 text-[#8A05BE]" : "bg-blue-100 text-blue-600"}`}>
                      <span className="material-symbols-outlined text-lg">{r.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{r.title}</p>
                      <p className="text-xs text-gray-500 truncate">{r.subtitle}</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 text-lg">chevron_right</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: notifications + profile */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2.5 rounded-xl hover:bg-white/60 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-white/60 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#8A05BE] to-[#6B04A0] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {userInitial}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-bold text-gray-900 leading-tight">{userName}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{userRole}</p>
            </div>
            <span className={`material-symbols-outlined text-gray-400 text-lg hidden lg:block transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}>
              expand_more
            </span>
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setProfileOpen(false); router.push("/dashboard/perfil") }}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/60 transition-colors text-sm text-gray-700"
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  Ver Perfil
                </button>
                <button
                  onClick={() => { setProfileOpen(false); router.push("/dashboard/configuracoes") }}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/60 transition-colors text-sm text-gray-700"
                >
                  <span className="material-symbols-outlined text-lg">settings</span>
                  Configurações
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/60 transition-colors text-sm text-red-600"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
