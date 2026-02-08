"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface PatientRegistrationData {
  personalInfo: {
    name: string
    dateOfBirth: string
    gender: string
    cpf: string
    rg: string
  }
  contactInfo: {
    primaryPhone: string
    secondaryPhone?: string
    email?: string
    address: {
      street: string
      number: string
      complement?: string
      neighborhood: string
      city: string
      state: string
      zipCode: string
    }
  }
  emergencyContact: {
    name: string
    relationship: string
    phone: string
    email?: string
  }
  insuranceInfo?: {
    provider?: string
    policyNumber?: string
    groupNumber?: string
    validUntil?: string
  }
}

interface PatientRegistrationFormProps {
  initialData?: Partial<PatientRegistrationData>
  onSubmit: (data: PatientRegistrationData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
}

export function PatientRegistrationForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error
}: PatientRegistrationFormProps) {
  const [step, setStep] = React.useState(1)
  const [formData, setFormData] = React.useState<PatientRegistrationData>({
    personalInfo: {
      name: initialData?.personalInfo?.name || "",
      dateOfBirth: initialData?.personalInfo?.dateOfBirth || "",
      gender: initialData?.personalInfo?.gender || "",
      cpf: initialData?.personalInfo?.cpf || "",
      rg: initialData?.personalInfo?.rg || ""
    },
    contactInfo: {
      primaryPhone: initialData?.contactInfo?.primaryPhone || "",
      secondaryPhone: initialData?.contactInfo?.secondaryPhone || "",
      email: initialData?.contactInfo?.email || "",
      address: {
        street: initialData?.contactInfo?.address?.street || "",
        number: initialData?.contactInfo?.address?.number || "",
        complement: initialData?.contactInfo?.address?.complement || "",
        neighborhood: initialData?.contactInfo?.address?.neighborhood || "",
        city: initialData?.contactInfo?.address?.city || "",
        state: initialData?.contactInfo?.address?.state || "",
        zipCode: initialData?.contactInfo?.address?.zipCode || ""
      }
    },
    emergencyContact: {
      name: initialData?.emergencyContact?.name || "",
      relationship: initialData?.emergencyContact?.relationship || "",
      phone: initialData?.emergencyContact?.phone || "",
      email: initialData?.emergencyContact?.email || ""
    },
    insuranceInfo: {
      provider: initialData?.insuranceInfo?.provider || "",
      policyNumber: initialData?.insuranceInfo?.policyNumber || "",
      groupNumber: initialData?.insuranceInfo?.groupNumber || "",
      validUntil: initialData?.insuranceInfo?.validUntil || ""
    }
  })

  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({})

  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!formData.personalInfo.name.trim()) {
        errors["personalInfo.name"] = "Nome completo é obrigatório"
      }
      if (!formData.personalInfo.dateOfBirth) {
        errors["personalInfo.dateOfBirth"] = "Data de nascimento é obrigatória"
      }
      if (!formData.personalInfo.gender) {
        errors["personalInfo.gender"] = "Gênero é obrigatório"
      }
      if (!formData.personalInfo.cpf.trim()) {
        errors["personalInfo.cpf"] = "CPF é obrigatório"
      }
      if (!formData.personalInfo.rg.trim()) {
        errors["personalInfo.rg"] = "RG é obrigatório"
      }
    }

    if (currentStep === 2) {
      if (!formData.contactInfo.primaryPhone.trim()) {
        errors["contactInfo.primaryPhone"] = "Telefone principal é obrigatório"
      }
      if (!formData.contactInfo.address.street.trim()) {
        errors["contactInfo.address.street"] = "Rua é obrigatória"
      }
      if (!formData.contactInfo.address.number.trim()) {
        errors["contactInfo.address.number"] = "Número é obrigatório"
      }
      if (!formData.contactInfo.address.neighborhood.trim()) {
        errors["contactInfo.address.neighborhood"] = "Bairro é obrigatório"
      }
      if (!formData.contactInfo.address.city.trim()) {
        errors["contactInfo.address.city"] = "Cidade é obrigatória"
      }
      if (!formData.contactInfo.address.state.trim()) {
        errors["contactInfo.address.state"] = "Estado é obrigatório"
      }
      if (!formData.contactInfo.address.zipCode.trim()) {
        errors["contactInfo.address.zipCode"] = "CEP é obrigatório"
      }
    }

    if (currentStep === 3) {
      if (!formData.emergencyContact.name.trim()) {
        errors["emergencyContact.name"] = "Nome do contato de emergência é obrigatório"
      }
      if (!formData.emergencyContact.relationship.trim()) {
        errors["emergencyContact.relationship"] = "Parentesco é obrigatório"
      }
      if (!formData.emergencyContact.phone.trim()) {
        errors["emergencyContact.phone"] = "Telefone de emergência é obrigatório"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
    setValidationErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateStep(step)) {
      await onSubmit(formData)
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
    if (validationErrors[`contactInfo.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`contactInfo.${field}`]
        return newErrors
      })
    }
  }

  const updateEmergencyContact = (field: keyof PatientRegistrationData["emergencyContact"], value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value }
    }))
    if (validationErrors[`emergencyContact.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`emergencyContact.${field}`]
        return newErrors
      })
    }
  }

  const updateInsuranceInfo = (field: keyof NonNullable<PatientRegistrationData["insuranceInfo"]>, value: string) => {
    setFormData(prev => ({
      ...prev,
      insuranceInfo: { ...prev.insuranceInfo, [field]: value }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <React.Fragment key={s}>
            <button
              type="button"
              onClick={() => s < step && setStep(s)}
              disabled={s > step}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s
                  ? "bg-purple-600 text-white"
                  : step > s
                    ? "bg-green-500 text-white cursor-pointer hover:bg-green-600"
                    : "bg-gray-200 text-gray-600 cursor-not-allowed"
              }`}
            >
              {step > s ? "✓" : s}
            </button>
            {s < 4 && (
              <div
                className={`flex-1 h-1 ${
                  step > s ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Personal Information */}
        {step === 1 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Dados Pessoais</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.personalInfo.name}
                  onChange={(e) => updatePersonalInfo("name", e.target.value)}
                  placeholder="Nome completo do paciente"
                  className={validationErrors["personalInfo.name"] ? "border-red-500" : ""}
                />
                {validationErrors["personalInfo.name"] && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors["personalInfo.name"]}</p>
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
                  <Label htmlFor="gender">Gênero *</Label>
                  <select
                    id="gender"
                    value={formData.personalInfo.gender}
                    onChange={(e) => updatePersonalInfo("gender", e.target.value)}
                    className={`w-full h-10 px-3 border rounded-md ${validationErrors["personalInfo.gender"] ? "border-red-500" : "border-gray-300"}`}
                  >
                    <option value="">Selecione</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                  </select>
                  {validationErrors["personalInfo.gender"] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors["personalInfo.gender"]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.personalInfo.cpf}
                    onChange={(e) => updatePersonalInfo("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    className={validationErrors["personalInfo.cpf"] ? "border-red-500" : ""}
                  />
                  {validationErrors["personalInfo.cpf"] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors["personalInfo.cpf"]}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="rg">RG *</Label>
                  <Input
                    id="rg"
                    value={formData.personalInfo.rg}
                    onChange={(e) => updatePersonalInfo("rg", e.target.value)}
                    placeholder="00.000.000-0"
                    className={validationErrors["personalInfo.rg"] ? "border-red-500" : ""}
                  />
                  {validationErrors["personalInfo.rg"] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors["personalInfo.rg"]}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
                Próximo →
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Contact Information */}
        {step === 2 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Informações de Contato</h2>

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
                    <Label htmlFor="zipCode">CEP *</Label>
                    <Input
                      id="zipCode"
                      value={formData.contactInfo.address.zipCode}
                      onChange={(e) => updateContactInfo("address.zipCode", e.target.value)}
                      placeholder="00000-000"
                      className={validationErrors["contactInfo.address.zipCode"] ? "border-red-500" : ""}
                    />
                    {validationErrors["contactInfo.address.zipCode"] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors["contactInfo.address.zipCode"]}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor="street">Rua *</Label>
                      <Input
                        id="street"
                        value={formData.contactInfo.address.street}
                        onChange={(e) => updateContactInfo("address.street", e.target.value)}
                        placeholder="Nome da rua"
                        className={validationErrors["contactInfo.address.street"] ? "border-red-500" : ""}
                      />
                      {validationErrors["contactInfo.address.street"] && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors["contactInfo.address.street"]}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="number">Número *</Label>
                      <Input
                        id="number"
                        value={formData.contactInfo.address.number}
                        onChange={(e) => updateContactInfo("address.number", e.target.value)}
                        placeholder="123"
                        className={validationErrors["contactInfo.address.number"] ? "border-red-500" : ""}
                      />
                      {validationErrors["contactInfo.address.number"] && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors["contactInfo.address.number"]}</p>
                      )}
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
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        value={formData.contactInfo.address.neighborhood}
                        onChange={(e) => updateContactInfo("address.neighborhood", e.target.value)}
                        placeholder="Nome do bairro"
                        className={validationErrors["contactInfo.address.neighborhood"] ? "border-red-500" : ""}
                      />
                      {validationErrors["contactInfo.address.neighborhood"] && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors["contactInfo.address.neighborhood"]}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={formData.contactInfo.address.city}
                        onChange={(e) => updateContactInfo("address.city", e.target.value)}
                        placeholder="Nome da cidade"
                        className={validationErrors["contactInfo.address.city"] ? "border-red-500" : ""}
                      />
                      {validationErrors["contactInfo.address.city"] && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors["contactInfo.address.city"]}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="state">Estado *</Label>
                      <select
                        id="state"
                        value={formData.contactInfo.address.state}
                        onChange={(e) => updateContactInfo("address.state", e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md ${validationErrors["contactInfo.address.state"] ? "border-red-500" : "border-gray-300"}`}
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
                      {validationErrors["contactInfo.address.state"] && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors["contactInfo.address.state"]}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={handleBack}>
                ← Voltar
              </Button>
              <Button type="button" onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
                Próximo →
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Emergency Contact */}
        {step === 3 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Contato de Emergência</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="emergencyName">Nome *</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyContact.name}
                  onChange={(e) => updateEmergencyContact("name", e.target.value)}
                  placeholder="Nome do contato de emergência"
                  className={validationErrors["emergencyContact.name"] ? "border-red-500" : ""}
                />
                {validationErrors["emergencyContact.name"] && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors["emergencyContact.name"]}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="relationship">Parentesco *</Label>
                  <Input
                    id="relationship"
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => updateEmergencyContact("relationship", e.target.value)}
                    placeholder="Ex: Mãe, Pai, Cônjuge"
                    className={validationErrors["emergencyContact.relationship"] ? "border-red-500" : ""}
                  />
                  {validationErrors["emergencyContact.relationship"] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors["emergencyContact.relationship"]}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Telefone *</Label>
                  <Input
                    id="emergencyPhone"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => updateEmergencyContact("phone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    className={validationErrors["emergencyContact.phone"] ? "border-red-500" : ""}
                  />
                  {validationErrors["emergencyContact.phone"] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors["emergencyContact.phone"]}</p>
                  )}
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

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={handleBack}>
                ← Voltar
              </Button>
              <Button type="button" onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
                Próximo →
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Insurance Information (Optional) */}
        {step === 4 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Informações do Convênio (Opcional)</h2>

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

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={handleBack}>
                ← Voltar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? "Salvando..." : "Salvar Paciente"}
              </Button>
            </div>
          </Card>
        )}
      </form>

      {onCancel && (
        <div className="flex justify-center">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}

