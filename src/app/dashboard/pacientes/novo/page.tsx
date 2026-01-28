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
import type { CreatePatientInput } from "@/lib/core"

export default function NovoPatientePage() {
  const router = useRouter()
  const { create, loading, error } = usePatientMutations()

  const [formData, setFormData] = React.useState<CreatePatientInput>({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    cpf: "",
    guardianName: "",
    guardianPhone: "",
    guardianRelationship: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
    },
    medicalHistory: {
      diagnosis: [],
      medications: [],
      allergies: [],
      notes: "",
    },
  })

  const [diagnosisInput, setDiagnosisInput] = React.useState("")
  const [medicationInput, setMedicationInput] = React.useState("")
  const [allergyInput, setAllergyInput] = React.useState("")
  const [step, setStep] = React.useState(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await create(formData)

    if (result.success) {
      router.push("/dashboard/pacientes")
      router.refresh()
    }
  }

  const updateField = <K extends keyof CreatePatientInput>(
    field: K,
    value: CreatePatientInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateAddress = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }))
  }

  const updateMedicalHistory = (field: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      medicalHistory: { ...prev.medicalHistory, [field]: value },
    }))
  }

  const addToList = (
    list: "diagnosis" | "medications" | "allergies",
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!value.trim()) return
    const currentList = formData.medicalHistory?.[list] ?? []
    updateMedicalHistory(list, [...currentList, value.trim()])
    setter("")
  }

  const removeFromList = (list: "diagnosis" | "medications" | "allergies", index: number) => {
    const currentList = formData.medicalHistory?.[list] ?? []
    updateMedicalHistory(
      list,
      currentList.filter((_, i) => i !== index)
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Novo Paciente
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Preencha os dados do novo paciente
          </p>
        </div>
        <Link href="/dashboard/pacientes">
          <Button variant="ghost">← Voltar</Button>
        </Link>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <button
              onClick={() => setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s
                  ? "bg-purple-600 text-white"
                  : step > s
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {step > s ? "✓" : s}
            </button>
            {s < 3 && (
              <div
                className={`flex-1 h-1 ${
                  step > s ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Dados Pessoais */}
        {step === 1 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dados Pessoais
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Nome do paciente"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birthDate">Data de Nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => updateField("birthDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => updateField("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  Responsável (opcional)
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="guardianName">Nome do Responsável</Label>
                    <Input
                      id="guardianName"
                      value={formData.guardianName}
                      onChange={(e) => updateField("guardianName", e.target.value)}
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="guardianPhone">Telefone</Label>
                      <Input
                        id="guardianPhone"
                        value={formData.guardianPhone}
                        onChange={(e) => updateField("guardianPhone", e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guardianRelationship">Parentesco</Label>
                      <Input
                        id="guardianRelationship"
                        value={formData.guardianRelationship}
                        onChange={(e) => updateField("guardianRelationship", e.target.value)}
                        placeholder="Ex: Mãe, Pai, Avó"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" onClick={() => setStep(2)} className="bg-purple-600 hover:bg-purple-700">
                Próximo →
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Endereço */}
        {step === 2 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Endereço</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={formData.address?.zipCode}
                  onChange={(e) => updateAddress("zipCode", e.target.value)}
                  placeholder="00000-000"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={formData.address?.street}
                    onChange={(e) => updateAddress("street", e.target.value)}
                    placeholder="Nome da rua"
                  />
                </div>
                <div>
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.address?.number}
                    onChange={(e) => updateAddress("number", e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.address?.complement}
                    onChange={(e) => updateAddress("complement", e.target.value)}
                    placeholder="Apto, Bloco, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.address?.neighborhood}
                    onChange={(e) => updateAddress("neighborhood", e.target.value)}
                    placeholder="Nome do bairro"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.address?.city}
                    onChange={(e) => updateAddress("city", e.target.value)}
                    placeholder="Nome da cidade"
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <select
                    id="state"
                    value={formData.address?.state}
                    onChange={(e) => updateAddress("state", e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  >
                    <option value="">Selecione</option>
                    {[
                      "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
                      "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
                      "RS", "RO", "RR", "SC", "SP", "SE", "TO",
                    ].map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                ← Voltar
              </Button>
              <Button type="button" onClick={() => setStep(3)} className="bg-purple-600 hover:bg-purple-700">
                Próximo →
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Histórico Médico */}
        {step === 3 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Histórico Médico
            </h2>

            <div className="space-y-4">
              {/* Diagnósticos */}
              <div>
                <Label>Diagnósticos</Label>
                <div className="flex gap-2">
                  <Input
                    value={diagnosisInput}
                    onChange={(e) => setDiagnosisInput(e.target.value)}
                    placeholder="Adicionar diagnóstico"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addToList("diagnosis", diagnosisInput, setDiagnosisInput)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addToList("diagnosis", diagnosisInput, setDiagnosisInput)}
                  >
                    +
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.medicalHistory?.diagnosis?.map((d, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full flex items-center gap-1"
                    >
                      {d}
                      <button
                        type="button"
                        onClick={() => removeFromList("diagnosis", i)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Medicamentos */}
              <div>
                <Label>Medicamentos</Label>
                <div className="flex gap-2">
                  <Input
                    value={medicationInput}
                    onChange={(e) => setMedicationInput(e.target.value)}
                    placeholder="Adicionar medicamento"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addToList("medications", medicationInput, setMedicationInput)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addToList("medications", medicationInput, setMedicationInput)}
                  >
                    +
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.medicalHistory?.medications?.map((m, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full flex items-center gap-1"
                    >
                      {m}
                      <button
                        type="button"
                        onClick={() => removeFromList("medications", i)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Alergias */}
              <div>
                <Label>Alergias</Label>
                <div className="flex gap-2">
                  <Input
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    placeholder="Adicionar alergia"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addToList("allergies", allergyInput, setAllergyInput)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addToList("allergies", allergyInput, setAllergyInput)}
                  >
                    +
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.medicalHistory?.allergies?.map((a, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-full flex items-center gap-1"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => removeFromList("allergies", i)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.medicalHistory?.notes}
                  onChange={(e) => updateMedicalHistory("notes", e.target.value)}
                  placeholder="Observações adicionais sobre o histórico médico..."
                  rows={4}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                ← Voltar
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.name}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? "Salvando..." : "Salvar Paciente"}
              </Button>
            </div>
          </Card>
        )}
      </form>
    </div>
  )
}
