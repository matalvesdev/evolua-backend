"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  PatientActionButtons,
  PatientStatusBadge,
  PatientSectionHeader
} from "@/components/patients"

interface EditPatientPageProps {
  params: Promise<{ id: string }>
}

export default function EditPatientPage({ params }: EditPatientPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Mock data - substituir por dados reais do Supabase
  const [formData, setFormData] = useState({
    fullName: "Ana Clara Souza",
    birthDate: "2019-05-12",
    gender: "female",
    schooling: "pre-school",
    guardianName: "Mariana Souza",
    relationship: "mother",
    cpf: "",
    whatsapp: "(11) 99999-8888",
    cid: "",
    specialty: "Terapia de Linguagem",
    observations: "Paciente apresenta atraso na aquisição da fala. Observa-se troca de fonemas /r/ e /l/. Recomendada avaliação auditiva complementar.",
    status: "active" as const
  })

  const handleSave = async () => {
    setIsLoading(true)
    // Implementar salvamento com Supabase
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsLoading(false)
    router.push(`/dashboard/pacientes/${id}`)
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="relative min-h-screen">
      {/* Gradient Orbs */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 md:px-8 py-8 pb-12">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/dashboard/pacientes" className="hover:text-[#820AD1] transition-colors">
            Pacientes
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link href={`/dashboard/pacientes/${id}`} className="hover:text-[#820AD1] transition-colors">
            {formData.fullName}
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#820AD1] font-medium">Editar Dados</span>
        </div>

        {/* Form Card */}
        <div className="glass-card rounded-3xl p-8 md:p-10 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#820AD1]/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-gray-100 pb-8 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative group cursor-pointer">
                <div className="size-20 rounded-2xl bg-gradient-to-br from-[#820AD1] to-purple-400 shadow-lg border-2 border-white flex items-center justify-center text-white text-3xl font-bold">
                  {formData.fullName.charAt(0)}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                  <span className="material-symbols-outlined text-white">edit</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Editar Paciente</h1>
                <p className="text-gray-600 mt-1">
                  Atualize as informações de <span className="font-medium text-gray-900">{formData.fullName}</span>
                </p>
              </div>
            </div>
            <PatientStatusBadge status={formData.status} />
          </div>

          {/* Form */}
          <form className="space-y-10 relative z-10">
            {/* Dados Pessoais */}
            <div>
              <PatientSectionHeader icon="person" title="Dados Pessoais" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="fullName">
                    Nome Completo
                  </label>
                  <input
                    className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium"
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="birthDate">
                    Data de Nascimento
                  </label>
                  <input
                    className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium"
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="gender">
                    Gênero
                  </label>
                  <div className="relative">
                    <select
                      className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium appearance-none"
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="female">Feminino</option>
                      <option value="male">Masculino</option>
                      <option value="other">Outro</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="schooling">
                    Escolaridade
                  </label>
                  <div className="relative">
                    <select
                      className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium appearance-none"
                      id="schooling"
                      value={formData.schooling}
                      onChange={(e) => setFormData({ ...formData, schooling: e.target.value })}
                    >
                      <option value="pre-school">Pré-escola (Educação Infantil)</option>
                      <option value="elementary">Ensino Fundamental I</option>
                      <option value="none">Não escolarizado</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Responsáveis */}
            <div>
              <PatientSectionHeader icon="diversity_3" title="Responsáveis" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="guardianName">
                    Nome do Responsável
                  </label>
                  <input
                    className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium"
                    id="guardianName"
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="relationship">
                    Parentesco
                  </label>
                  <div className="relative">
                    <select
                      className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium appearance-none"
                      id="relationship"
                      value={formData.relationship}
                      onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    >
                      <option value="mother">Mãe</option>
                      <option value="father">Pai</option>
                      <option value="grandparent">Avô/Avó</option>
                      <option value="other">Outro</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="cpf">
                    CPF
                  </label>
                  <input
                    className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium"
                    id="cpf"
                    placeholder="000.000.000-00"
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="whatsapp">
                    Contato (WhatsApp)
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <span className="material-symbols-outlined text-[20px]">chat</span>
                    </div>
                    <input
                      className="w-full rounded-xl border-gray-200 bg-white/50 pl-12 pr-4 py-3 text-gray-900 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium"
                      id="whatsapp"
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Dados Clínicos */}
            <div>
              <PatientSectionHeader icon="medical_information" title="Dados Clínicos" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="cid">
                    Diagnóstico (CID)
                  </label>
                  <input
                    className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium"
                    id="cid"
                    placeholder="Ex: F80.9"
                    type="text"
                    value={formData.cid}
                    onChange={(e) => setFormData({ ...formData, cid: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="specialty">
                    Especialidade Focada
                  </label>
                  <input
                    className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium"
                    id="specialty"
                    type="text"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="observations">
                    Observações Médicas Iniciais
                  </label>
                  <textarea
                    className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 focus:border-[#820AD1] focus:ring-2 focus:ring-[#820AD1]/20 outline-none transition-all font-medium resize-none leading-relaxed"
                    id="observations"
                    rows={4}
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <PatientActionButtons
              onCancel={handleCancel}
              onSave={handleSave}
              isLoading={isLoading}
            />
          </form>
        </div>
      </div>
    </div>
  )
}
