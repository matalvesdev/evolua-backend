"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus } from "lucide-react"

export interface DiagnosisFormData {
  code: string
  description: string
  diagnosedAt: string
  severity: "mild" | "moderate" | "severe" | "unknown"
}

export interface MedicationFormData {
  name: string
  dosage: string
  frequency: string
  startDate: string
  endDate?: string
  prescribedBy: string
  notes?: string
}

export interface AllergyFormData {
  allergen: string
  reaction: string
  severity: "mild" | "moderate" | "severe" | "life_threatening"
  diagnosedAt: string
  notes?: string
}

export interface MedicalHistoryData {
  diagnosis: DiagnosisFormData[]
  medications: MedicationFormData[]
  allergies: AllergyFormData[]
}

interface MedicalHistoryInputFormProps {
  initialData?: Partial<MedicalHistoryData>
  onSubmit: (data: MedicalHistoryData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
}

export function MedicalHistoryInputForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error
}: MedicalHistoryInputFormProps) {
  const [formData, setFormData] = React.useState<MedicalHistoryData>({
    diagnosis: initialData?.diagnosis || [],
    medications: initialData?.medications || [],
    allergies: initialData?.allergies || []
  })

  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({})

  // Diagnosis handlers
  const addDiagnosis = () => {
    setFormData(prev => ({
      ...prev,
      diagnosis: [
        ...prev.diagnosis,
        {
          code: "",
          description: "",
          diagnosedAt: new Date().toISOString().split("T")[0],
          severity: "unknown"
        }
      ]
    }))
  }

  const updateDiagnosis = (index: number, field: keyof DiagnosisFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: prev.diagnosis.map((d, i) =>
        i === index ? { ...d, [field]: value } : d
      )
    }))
  }

  const removeDiagnosis = (index: number) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: prev.diagnosis.filter((_, i) => i !== index)
    }))
  }

  // Medication handlers
  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          name: "",
          dosage: "",
          frequency: "",
          startDate: new Date().toISOString().split("T")[0],
          prescribedBy: "",
          notes: ""
        }
      ]
    }))
  }

  const updateMedication = (index: number, field: keyof MedicationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      )
    }))
  }

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }))
  }

  // Allergy handlers
  const addAllergy = () => {
    setFormData(prev => ({
      ...prev,
      allergies: [
        ...prev.allergies,
        {
          allergen: "",
          reaction: "",
          severity: "mild",
          diagnosedAt: new Date().toISOString().split("T")[0],
          notes: ""
        }
      ]
    }))
  }

  const updateAllergy = (index: number, field: keyof AllergyFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      )
    }))
  }

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }))
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Validate diagnosis
    formData.diagnosis.forEach((d, i) => {
      if (!d.code.trim()) {
        errors[`diagnosis.${i}.code`] = "Código é obrigatório"
      }
      if (!d.description.trim()) {
        errors[`diagnosis.${i}.description`] = "Descrição é obrigatória"
      }
    })

    // Validate medications
    formData.medications.forEach((m, i) => {
      if (!m.name.trim()) {
        errors[`medications.${i}.name`] = "Nome é obrigatório"
      }
      if (!m.dosage.trim()) {
        errors[`medications.${i}.dosage`] = "Dosagem é obrigatória"
      }
      if (!m.frequency.trim()) {
        errors[`medications.${i}.frequency`] = "Frequência é obrigatória"
      }
      if (!m.prescribedBy.trim()) {
        errors[`medications.${i}.prescribedBy`] = "Prescritor é obrigatório"
      }
    })

    // Validate allergies
    formData.allergies.forEach((a, i) => {
      if (!a.allergen.trim()) {
        errors[`allergies.${i}.allergen`] = "Alérgeno é obrigatório"
      }
      if (!a.reaction.trim()) {
        errors[`allergies.${i}.reaction`] = "Reação é obrigatória"
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      await onSubmit(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Diagnosis Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Diagnósticos</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDiagnosis}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {formData.diagnosis.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum diagnóstico adicionado</p>
        ) : (
          <div className="space-y-4">
            {formData.diagnosis.map((diagnosis, index) => (
              <Card key={index} className="p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Diagnóstico {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeDiagnosis(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`diagnosis-code-${index}`}>Código (CID-10) *</Label>
                    <Input
                      id={`diagnosis-code-${index}`}
                      value={diagnosis.code}
                      onChange={(e) => updateDiagnosis(index, "code", e.target.value)}
                      placeholder="Ex: F80.1"
                      className={validationErrors[`diagnosis.${index}.code`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`diagnosis.${index}.code`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {validationErrors[`diagnosis.${index}.code`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`diagnosis-severity-${index}`}>Gravidade *</Label>
                    <select
                      id={`diagnosis-severity-${index}`}
                      value={diagnosis.severity}
                      onChange={(e) => updateDiagnosis(index, "severity", e.target.value)}
                      className="w-full h-8 px-2.5 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="unknown">Desconhecida</option>
                      <option value="mild">Leve</option>
                      <option value="moderate">Moderada</option>
                      <option value="severe">Grave</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor={`diagnosis-description-${index}`}>Descrição *</Label>
                    <Textarea
                      id={`diagnosis-description-${index}`}
                      value={diagnosis.description}
                      onChange={(e) => updateDiagnosis(index, "description", e.target.value)}
                      placeholder="Descrição detalhada do diagnóstico"
                      className={validationErrors[`diagnosis.${index}.description`] ? "border-red-500" : ""}
                      rows={2}
                    />
                    {validationErrors[`diagnosis.${index}.description`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {validationErrors[`diagnosis.${index}.description`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`diagnosis-date-${index}`}>Data do Diagnóstico *</Label>
                    <Input
                      id={`diagnosis-date-${index}`}
                      type="date"
                      value={diagnosis.diagnosedAt}
                      onChange={(e) => updateDiagnosis(index, "diagnosedAt", e.target.value)}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Medications Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Medicações</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMedication}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {formData.medications.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma medicação adicionada</p>
        ) : (
          <div className="space-y-4">
            {formData.medications.map((medication, index) => (
              <Card key={index} className="p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Medicação {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeMedication(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`medication-name-${index}`}>Nome *</Label>
                    <Input
                      id={`medication-name-${index}`}
                      value={medication.name}
                      onChange={(e) => updateMedication(index, "name", e.target.value)}
                      placeholder="Nome do medicamento"
                      className={validationErrors[`medications.${index}.name`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`medications.${index}.name`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {validationErrors[`medications.${index}.name`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`medication-dosage-${index}`}>Dosagem *</Label>
                    <Input
                      id={`medication-dosage-${index}`}
                      value={medication.dosage}
                      onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                      placeholder="Ex: 500mg"
                      className={validationErrors[`medications.${index}.dosage`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`medications.${index}.dosage`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {validationErrors[`medications.${index}.dosage`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`medication-frequency-${index}`}>Frequência *</Label>
                    <Input
                      id={`medication-frequency-${index}`}
                      value={medication.frequency}
                      onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                      placeholder="Ex: 2x ao dia"
                      className={validationErrors[`medications.${index}.frequency`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`medications.${index}.frequency`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {validationErrors[`medications.${index}.frequency`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`medication-prescriber-${index}`}>Prescritor *</Label>
                    <Input
                      id={`medication-prescriber-${index}`}
                      value={medication.prescribedBy}
                      onChange={(e) => updateMedication(index, "prescribedBy", e.target.value)}
                      placeholder="Nome do médico"
                      className={validationErrors[`medications.${index}.prescribedBy`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`medications.${index}.prescribedBy`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {validationErrors[`medications.${index}.prescribedBy`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`medication-start-${index}`}>Data de Início *</Label>
                    <Input
                      id={`medication-start-${index}`}
                      type="date"
                      value={medication.startDate}
                      onChange={(e) => updateMedication(index, "startDate", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`medication-end-${index}`}>Data de Término</Label>
                    <Input
                      id={`medication-end-${index}`}
                      type="date"
                      value={medication.endDate || ""}
                      onChange={(e) => updateMedication(index, "endDate", e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor={`medication-notes-${index}`}>Observações</Label>
                    <Textarea
                      id={`medication-notes-${index}`}
                      value={medication.notes || ""}
                      onChange={(e) => updateMedication(index, "notes", e.target.value)}
                      placeholder="Observações adicionais"
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Allergies Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Alergias</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAllergy}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {formData.allergies.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma alergia adicionada</p>
        ) : (
          <div className="space-y-4">
            {formData.allergies.map((allergy, index) => (
              <Card key={index} className="p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Alergia {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeAllergy(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`allergy-allergen-${index}`}>Alérgeno *</Label>
                    <Input
                      id={`allergy-allergen-${index}`}
                      value={allergy.allergen}
                      onChange={(e) => updateAllergy(index, "allergen", e.target.value)}
                      placeholder="Ex: Penicilina"
                      className={validationErrors[`allergies.${index}.allergen`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`allergies.${index}.allergen`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {validationErrors[`allergies.${index}.allergen`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`allergy-severity-${index}`}>Gravidade *</Label>
                    <select
                      id={`allergy-severity-${index}`}
                      value={allergy.severity}
                      onChange={(e) => updateAllergy(index, "severity", e.target.value)}
                      className="w-full h-8 px-2.5 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="mild">Leve</option>
                      <option value="moderate">Moderada</option>
                      <option value="severe">Grave</option>
                      <option value="life_threatening">Risco de Vida</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor={`allergy-reaction-${index}`}>Reação *</Label>
                    <Textarea
                      id={`allergy-reaction-${index}`}
                      value={allergy.reaction}
                      onChange={(e) => updateAllergy(index, "reaction", e.target.value)}
                      placeholder="Descrição da reação alérgica"
                      className={validationErrors[`allergies.${index}.reaction`] ? "border-red-500" : ""}
                      rows={2}
                    />
                    {validationErrors[`allergies.${index}.reaction`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {validationErrors[`allergies.${index}.reaction`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`allergy-date-${index}`}>Data do Diagnóstico *</Label>
                    <Input
                      id={`allergy-date-${index}`}
                      type="date"
                      value={allergy.diagnosedAt}
                      onChange={(e) => updateAllergy(index, "diagnosedAt", e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor={`allergy-notes-${index}`}>Observações</Label>
                    <Textarea
                      id={`allergy-notes-${index}`}
                      value={allergy.notes || ""}
                      onChange={(e) => updateAllergy(index, "notes", e.target.value)}
                      placeholder="Observações adicionais"
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isLoading ? "Salvando..." : "Salvar Histórico Médico"}
        </Button>
      </div>
    </form>
  )
}
