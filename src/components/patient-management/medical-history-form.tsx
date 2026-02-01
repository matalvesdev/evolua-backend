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
    recom