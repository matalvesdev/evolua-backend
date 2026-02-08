"use client"

import * as React from "react"
import { useUser } from "@/hooks"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default function ConfiguracoesPage() {
  const { loading } = useUser()
  const [isSaving, setIsSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  const [prefs, setPrefs] = React.useState({
    emailNotifications: true,
    pushNotifications: true,
    appointmentReminders: true,
    reportNotifications: true,
    darkMode: false,
  })

  const [passwords, setPasswords] = React.useState({
    current: "",
    newPass: "",
    confirm: "",
  })
  const [passError, setPassError] = React.useState("")
  const [passSuccess, setPassSuccess] = React.useState(false)

  const togglePref = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const handleSavePrefs = async () => {
    setIsSaving(true)
    setSaved(false)
    await new Promise((r) => setTimeout(r, 1000))
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassError("")
    setPassSuccess(false)
    if (passwords.newPass.length < 6) {
      setPassError("A nova senha deve ter pelo menos 6 caracteres")
      return
    }
    if (passwords.newPass !== passwords.confirm) {
      setPassError("As senhas não coincidem")
      return
    }
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 1000))
    setIsSaving(false)
    setPassSuccess(true)
    setPasswords({ current: "", newPass: "", confirm: "" })
    setTimeout(() => setPassSuccess(false), 3000)
  }

  if (loading) {
    return (
      <>
        <DashboardHeader />
        <div className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-[#8A05BE] animate-spin">progress_activity</span>
        </div>
      </>
    )
  }

  const notifItems = [
    { key: "emailNotifications" as const, icon: "mail", label: "Notificações por e-mail", desc: "Receba atualizações e lembretes por e-mail" },
    { key: "pushNotifications" as const, icon: "notifications_active", label: "Notificações push", desc: "Receba notificações no navegador" },
    { key: "appointmentReminders" as const, icon: "event", label: "Lembretes de agendamentos", desc: "Receba lembretes antes dos agendamentos" },
    { key: "reportNotifications" as const, icon: "description", label: "Notificações de relatórios", desc: "Seja notificado quando relatórios forem gerados" },
  ]

  return (
    <>
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie suas preferências e segurança</p>
          </div>

          {/* Notifications */}
          <div className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-purple-50">
                <span className="material-symbols-outlined text-[#8A05BE]">notifications</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Notificações</h2>
                <p className="text-xs text-gray-500">Controle como você recebe alertas</p>
              </div>
            </div>

            <div className="space-y-1">
              {notifItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => togglePref(item.key)}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-gray-400">{item.icon}</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative transition-colors ${prefs[item.key] ? "bg-[#8A05BE]" : "bg-gray-300"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${prefs[item.key] ? "translate-x-5.5" : "translate-x-0.5"}`} />
                  </div>
                </button>
              ))}
            </div>

            {/* Appearance */}
            <div className="border-t border-gray-100/50 mt-4 pt-4">
              <button
                type="button"
                onClick={() => togglePref("darkMode")}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-400">dark_mode</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Modo escuro</p>
                    <p className="text-xs text-gray-500">Ativar tema escuro na interface</p>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full relative transition-colors ${prefs.darkMode ? "bg-[#8A05BE]" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${prefs.darkMode ? "translate-x-5.5" : "translate-x-0.5"}`} />
                </div>
              </button>
            </div>

            {/* Save prefs */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100/50 mt-4">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Salvo com sucesso
                </span>
              )}
              <button
                onClick={handleSavePrefs}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#8A05BE] text-white text-sm font-semibold hover:bg-[#7A04AA] disabled:opacity-60 transition-all shadow-lg shadow-purple-200/50"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">save</span>
                    Salvar preferências
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security */}
          <div className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-purple-50">
                <span className="material-symbols-outlined text-[#8A05BE]">lock</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Segurança</h2>
                <p className="text-xs text-gray-500">Altere sua senha de acesso</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Senha atual</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">key</span>
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all"
                    value={passwords.current}
                    onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Nova senha</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">lock</span>
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all"
                    value={passwords.newPass}
                    onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Confirmar nova senha</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">lock</span>
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {passError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {passError}
                </div>
              )}

              {passSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2.5 rounded-xl">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Senha alterada com sucesso
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#8A05BE] text-white text-sm font-semibold hover:bg-[#7A04AA] disabled:opacity-60 transition-all shadow-lg shadow-purple-200/50"
              >
                <span className="material-symbols-outlined text-lg">lock</span>
                Alterar senha
              </button>
            </form>
          </div>

          {/* Danger zone */}
          <div className="glass-card p-6 md:p-8 border-red-200/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-50">
                <span className="material-symbols-outlined text-red-500">warning</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-900">Zona de perigo</h2>
                <p className="text-xs text-red-600">Ações irreversíveis que afetarão sua conta</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all">
              <span className="material-symbols-outlined text-lg">delete_forever</span>
              Excluir conta
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
