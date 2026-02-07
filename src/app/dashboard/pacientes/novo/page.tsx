"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePatientMutations } from "@/hooks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface FormData {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  cpf: string
  gender: string
  emergencyContact: string
  emergencyPhone: string
  address: string
  city: string
  state: string
  zipCode: string
  notes: string
}

export default function NovoPatientePage() {
  const router = useRouter()
  const { createPatient, isCreating } = usePatientMutations()
  const [error, setError] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    cpf: "",
    gender: "",
    emergencyContact: "",
    emergencyPhone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
  })

  const [step, setStep] = React.useState(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await createPatient({
        fullName: formData.fullName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        cpf: formData.cpf || undefined,
        gender: formData.gender || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyPhone: formData.emergencyPhone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        notes: formData.notes || undefined,
      })
      router.push("/dashboard/pacientes")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar paciente")
    }
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-2 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Novo Paciente</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Preencha os dados do novo paciente</p>
        </div>
        <Link href="/dashboard/pacientes">
          <Button variant="ghost">← Voltar</Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <button
              onClick={() => setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s ? "bg-purple-600 text-white" : step > s ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {step > s ? "✓" : s}
            </button>
            {s < 3 && <div className={`flex-1 h-1 ${step > s ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dados Pessoais</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Nome completo *</Label>
                <Input id="fullName" value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Nome do paciente" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Data de Nascimento</Label>
                  <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" value={formData.cpf} onChange={(e) => updateField("cpf", e.target.value)} placeholder="000.000.000-00" />
                </div>
              </div>
              <div>
                <Label htmlFor="gender">Gênero</Label>
                <select id="gender" value={formData.gender} onChange={(e) => updateField("gender", e.target.value)} className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                  <option value="">Selecione</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Contato de Emergência</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyContact">Nome</Label>
                    <Input id="emergencyContact" value={formData.emergencyContact} onChange={(e) => updateField("emergencyContact", e.target.value)} placeholder="Nome do contato" />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Telefone</Label>
                    <Input id="emergencyPhone" value={formData.emergencyPhone} onChange={(e) => updateField("emergencyPhone", e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" onClick={() => setStep(2)} className="bg-purple-600 hover:bg-purple-700">Próximo →</Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Endereço</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="zipCode">CEP</Label>
                <Input id="zipCode" value={formData.zipCode} onChange={(e) => updateField("zipCode", e.target.value)} placeholder="00000-000" />
              </div>
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" value={formData.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Rua, número, complemento" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={formData.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Nome da cidade" />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <select id="state" value={formData.state} onChange={(e) => updateField("state", e.target.value)} className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                    <option value="">Selecione</option>
                    {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
              <Button type="button" onClick={() => setStep(3)} className="bg-purple-600 hover:bg-purple-700">Próximo →</Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Observações</h2>
            <div>
              <Label htmlFor="notes">Observações gerais</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Observações sobre o paciente, histórico médico, diagnósticos..." rows={6} />
            </div>
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">{error}</div>
            )}
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>← Voltar</Button>
              <Button type="submit" disabled={isCreating || !formData.fullName} className="bg-purple-600 hover:bg-purple-700">
                {isCreating ? "Salvando..." : "Salvar Paciente"}
              </Button>
            </div>
          </Card>
        )}
      </form>
    </div>
  )
}
