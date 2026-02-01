"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PatientStatusBadge } from "@/components/patients"
import type { PatientRegistrationData } from "./patient-registration-form"

interface PatientProfileEditorProps {
  patientId: string
  initialData: PatientRegistrationData & {
    status: "new" | "active" | "on_hold" | "discharged" | "inactive"
  }
  onSave: (data: Partial<PatientRegistrationData>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  error?: string
}

export function PatientProfileEditor({
  patientId,
  initialData,
  onSave,
  onCancel,
  isLoading = false,
  error
}: PatientProfileEditorProps) {
  const [formData, setFormData] = React.useState<PatientRegistrationData>(initialData)
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({})
  const [activeSection, setActiveSection] = React.useState<"personal" | "contact" | "emergency" | "insurance">("personal")

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.personalInfo.fullName.trim()) {
      errors["personalInfo.fullName"] = "Nome completo é obrigatório"
    }
    if (!formData.personalInfo.dateOfBirth) {
      errors["personalInfo.dateOfBirth"] = "Data de nascimento é obrigatória"
    }
    if (!formData.contactInfo.primaryPhone.trim()) {
      errors["contactInfo.primaryPhone"] = "Telefone principal é obrigatório"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      await onSave(formData)
    }
  }

  const updatePersonalInfo = (field: keyof PatientRegistrationData["personalInfo"], value: string) => {
    setFormData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }))
    if (validationErrors[`personalInfo.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`personalInfo.${field}`]
        return newErrors
      })
    }
  }

  const updateContactInfo = (field: string, value: string) => {
    if (field.startsWith("address.")) {
      const addressField = field.replace("address.", "")
      setFormData(prev => ({
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          address: { ...prev.contactInfo.address, [addressField]: value }
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        contactInfo: { ...prev.contactInfo, [field]: value }
      }))
    }
  }

  const updateEmergencyContact = (field: keyof PatientRegistrationData["emergencyContact"], value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value }
    }))
  }

  const updateInsuranceInfo = (field: keyof NonNullable<PatientRegistrationData["insuranceInfo"]>, value: string) => {
    setFormData(prev => ({
      ...prev,
      insuranceInfo: { ...prev.insuranceInfo, [field]: value }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Perfil do Paciente</h1>
          <p className="text-gray-600 mt-1">
            Atualize as informações de <span className="font-medium text-gray-900">{initialData.personalInfo.fullName}</span>
          </p>
        </div>
        <PatientStatusBadge status={initialData.status} />
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "personal" as const, label: "Dados Pessoais", icon: "person" },
          { id: "contact" as const, label: "Contato", icon: "contact_phone" },
          { id: "emergency" as const, label: "Emergência", icon: "emergency" },
          { id: "insurance" as const, label: "Convênio", icon: "health_and_safety" }
        ].map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeSection === section.id
                ? "border-purple-600 text-purple-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information Section */}
        {activeSection === "personal" && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined">person</span>
              Dados Pessoais
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  value={formData.personalInfo.fullName}
                  onChange={(e) => updatePersonalInfo("fullName", e.target.value)}
                  className={validationErrors["personalInfo.fullName"] ? "border-red-500" : ""}
                />
                {validationErrors["personalInfo.fullName"] && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors["personalInfo.fullName"]}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Data de Nascimento *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.personalInfo.dateOfBirth}
                    onChange={(e) => updatePersonalInfo("dateOfBirth", e.target.value)}
                    className={validationErrors["personalInfo.dateOfBirth"] ? "border-red-500" : ""}
                  />
                  {validationErrors["personalInfo.dateOfBirth"] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors["personalInfo.dateOfBirth"]}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="gender">Gênero</Label>
                  <select
                    id="gender"
                    value={formData.personalInfo.gender}
                    onChange={(e) => updatePersonalInfo("gender", e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecione</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.personalInfo.cpf}
                    onChange={(e) => updatePersonalInfo("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={formData.personalInfo.rg}
                    onChange={(e) => updatePersonalInfo("rg", e.target.value)}
                    placeholder="00.000.000-0"
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Contact Information Section */}
        {activeSection === "contact" && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined">contact_phone</span>
              Informações de Contato
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryPhone">Telefone Principal *</Label>
                  <Input
                    id="primaryPhone"
                    value={formData.contactInfo.primaryPhone}
                    onChange={(e) => updateContactInfo("primaryPhone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    className={validationErrors["contactInfo.primaryPhone"] ? "border-red-500" : ""}
                  />
                  {validationErrors["contactInfo.primaryPhone"] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors["contactInfo.primaryPhone"]}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="secondaryPhone">Telefone Secundário</Label>
                  <Input
                    id="secondaryPhone"
                    value={formData.contactInfo.secondaryPhone}
                    onChange={(e) => updateContactInfo("secondaryPhone", e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) => updateContactInfo("email", e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Endereço</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={formData.contactInfo.address.zipCode}
                      onChange={(e) => updateContactInfo("address.zipCode", e.target.value)}
                      placeholder="00000-000"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor="street">Rua</Label>
                      <Input
                        id="street"
                        value={formData.contactInfo.address.street}
                        onChange={(e) => updateContactInfo("address.street", e.target.value)}
                        placeholder="Nome da rua"
                      />
                    </div>
                    <div>
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={formData.contactInfo.address.number}
                        onChange={(e) => updateContactInfo("address.number", e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={formData.contactInfo.address.complement}
                        onChange={(e) => updateContactInfo("address.complement", e.target.value)}
                        placeholder="Apto, Bloco, etc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={formData.contactInfo.address.neighborhood}
                        onChange={(e) => updateContactInfo("address.neighborhood", e.target.value)}
                        placeholder="Nome do bairro"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.contactInfo.address.city}
                        onChange={(e) => updateContactInfo("address.city", e.target.value)}
                        placeholder="Nome da cidade"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado</Label>
                      <select
                        id="state"
                        value={formData.contactInfo.address.state}
                        onChange={(e) => updateContactInfo("address.state", e.target.value)}
                        className="w-full h-10 px-3 border border-gray-300 rounded-md"
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
              </div>
            </div>
          </Card>
        )}

        {/* Emergency Contact Section */}
        {activeSection === "emergency" && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined">emergency</span>
              Contato de Emergência
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="emergencyName">Nome</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyContact.name}
                  onChange={(e) => updateEmergencyContact("name", e.target.value)}
                  placeholder="Nome do contato de emergência"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="relationship">Parentesco</Label>
                  <Input
                    id="relationship"
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => updateEmergencyContact("relationship", e.target.value)}
                    placeholder="Ex: Mãe, Pai, Cônjuge"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Telefone</Label>
                  <Input
                    id="emergencyPhone"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => updateEmergencyContact("phone", e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="emergencyEmail">Email</Label>
                <Input
                  id="emergencyEmail"
                  type="email"
                  value={formData.emergencyContact.email}
                  onChange={(e) => updateEmergencyContact("email", e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Insurance Information Section */}
        {activeSection === "insurance" && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined">health_and_safety</span>
              Informações do Convênio
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="provider">Operadora</Label>
                <Input
                  id="provider"
                  value={formData.insuranceInfo?.provider}
                  onChange={(e) => updateInsuranceInfo("provider", e.target.value)}
                  placeholder="Nome da operadora"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="policyNumber">Número da Apólice</Label>
                  <Input
                    id="policyNumber"
                    value={formData.insuranceInfo?.policyNumber}
                    onChange={(e) => updateInsuranceInfo("policyNumber", e.target.value)}
                    placeholder="Número da apólice"
                  />
                </div>
                <div>
                  <Label htmlFor="groupNumber">Número do Grupo</Label>
                  <Input
                    id="groupNumber"
                    value={formData.insuranceInfo?.groupNumber}
                    onChange={(e) => updateInsuranceInfo("groupNumber", e.target.value)}
                    placeholder="Número do grupo"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="validUntil">Válido Até</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.insuranceInfo?.validUntil}
                  onChange={(e) => updateInsuranceInfo("validUntil", e.target.value)}
                />
              </div>
            </div>
          </Card>
        )}

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  )
}
