"use client"

import * as React from "react"
import { useUser } from "@/hooks"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default function PerfilPage() {
  const { user, loading } = useUser()
  const [isSaving, setIsSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    crfa: "",
    specialization: "",
    bio: "",
  })

  React.useEffect(() => {
    if (user) {
      const m = user.user_metadata || {}
      setFormData({
        name: (m.name || m.full_name || "") as string,
        email: user.email || "",
        phone: (m.phone || "") as string,
        crfa: (m.crfa || "") as string,
        specialization: (m.specialization || "") as string,
        bio: (m.bio || "") as string,
      })
    }
  }, [user])

  const userName = (user?.user_metadata?.name || user?.user_metadata?.full_name || "Usuário") as string
  const userRole = user?.user_metadata?.role === "therapist" ? "Fonoaudiólogo(a)" : "Profissional"

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaved(false)
    await new Promise((r) => setTimeout(r, 1000))
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

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

  return (
    <>
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie suas informações pessoais</p>
          </div>

          {/* Profile card */}
          <div className="glass-card p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100/50">
              <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-[#8A05BE] to-[#6B04A0] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-200/50">
                {getInitials(userName)}
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-purple-50 text-[#8A05BE] text-xs font-semibold">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  {userRole}
                </span>
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white/60 hover:border-[#8A05BE]/30 transition-all">
                <span className="material-symbols-outlined text-lg">photo_camera</span>
                Alterar foto
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Nome completo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">person</span>
                    <input
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all"
                      value={formData.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">E-mail</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">mail</span>
                    <input
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all"
                      type="email"
                      value={formData.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Telefone</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">phone</span>
                    <input
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all"
                      value={formData.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">CRFa</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">badge</span>
                    <input
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all"
                      value={formData.crfa}
                      onChange={(e) => update("crfa", e.target.value)}
                      placeholder="0-00000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Especialização</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">school</span>
                    <input
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all"
                      value={formData.specialization}
                      onChange={(e) => update("specialization", e.target.value)}
                      placeholder="Ex: Fonoaudiologia Clínica"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Bio</label>
                  <textarea
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all resize-none"
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    placeholder="Uma breve descrição sobre você..."
                  />
                </div>
              </div>

              {/* Save button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100/50">
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Salvo com sucesso
                  </span>
                )}
                <button
                  type="submit"
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
                      Salvar alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
