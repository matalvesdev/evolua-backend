"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface MedicalHistoryData {
  diagnosis: Array<{
    code: string
    description: string
    diagnosedDate: string
    severity?: "mild" | "moderate" | "severe"
  }>
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    startDate: string
    endDate?: string
  }>
  allergies: Array<{
    allergen: string
    reaction: string
    severity: "mild" | "moderate" | "severe"
  }>
  progressNotes: Array<{
    date: string
    note: string
    author: string
  }>
  assessments: Array<{
    date: string
    type: string
    findings: string
    recommendations: string
  }>
}

interface MedicalHistoryFormProps {
  patientId: string
  initialData?: Partial<MedicalHistoryData>
  onSave: (data: MedicalHistoryData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
}

export function MedicalHistoryForm({
  patientId,
  initialData,
  onSave,
  onCancel,
  isLoading = false,
  error
}: MedicalHistoryFormProps) {
  const [formData, setFormData] = React.useState<MedicalHistoryData>({
    diagnosis: initialData?.diagnosis || [],
    medications: initialData?.medications || [],
    allergies: initialData?.allergies || [],
    progressNotes: initialData?.progressNotes || [],
    assessments: initialData?.assessments || []
  })

  const [activeSection, setActiveSection] = React.useState<"diagnosis" | "medications" | "allergies" | "notes" | "assessments">("diagnosis")

  // Diagnosis state
  const [diagnosisInput, setDiagnosisInput] = React.useState({
    code: "",
    description: "",
    diagnosedDate: "",
    severity: "moderate" as const
  })

  // Medication state
  const [medicationInput, setMedicationInput] = React.useState({
    name: "",
    dosage: "",
    frequency: "",
    startDate: "",
    endDate: ""
  })

  // Allergy state
  const [allergyInput, setAllergyInput] = React.useState({
    allergen: "",
    reaction: "",
    severity: "moderate" as const
  })

  // Progress Note state
  const [noteInput, setNoteInput] = React.useState({
    date: new Date().toISOString().split("T")[0],
    note: "",
    author: ""
  })

  // Assessment state
  const [assessmentInput, setAssessmentInput] = React.useState({
    date: new Date().toISOString().split("T")[0],
    type: "",
    findings: "",
    recommendations: ""
  })


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card className="p-6">
        <div className="flex gap-2 mb-6 border-b">
          <Button
            type="button"
            variant={activeSection === "diagnosis" ? "default" : "ghost"}
            onClick={() => setActiveSection("diagnosis")}
          >
            Diagnósticos
          </Button>
          <Button
            type="button"
            variant={activeSection === "medications" ? "default" : "ghost"}
            onClick={() => setActiveSection("medications")}
          >
            Medicações
          </Button>
          <Button
            type="button"
            variant={activeSection === "allergies" ? "default" : "ghost"}
            onClick={() => setActiveSection("allergies")}
          >
            Alergias
          </Button>
          <Button
            type="button"
            variant={activeSection === "notes" ? "default" : "ghost"}
            onClick={() => setActiveSection("notes")}
          >
            Notas
          </Button>
          <Button
            type="button"
            variant={activeSection === "assessments" ? "default" : "ghost"}
            onClick={() => setActiveSection("assessments")}
          >
            Avaliações
          </Button>
        </div>

        {activeSection === "diagnosis" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Diagnósticos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="diagnosis-code">Código</Label>
                <Input
                  id="diagnosis-code"
                  value={diagnosisInput.code}
                  onChange={(e) => setDiagnosisInput({ ...diagnosisInput, code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="diagnosis-date">Data do Diagnóstico</Label>
                <Input
                  id="diagnosis-date"
                  type="date"
                  value={diagnosisInput.diagnosedDate}
                  onChange={(e) => setDiagnosisInput({ ...diagnosisInput, diagnosedDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="diagnosis-description">Descrição</Label>
              <Textarea
                id="diagnosis-description"
                value={diagnosisInput.description}
                onChange={(e) => setDiagnosisInput({ ...diagnosisInput, description: e.target.value })}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  )
}
