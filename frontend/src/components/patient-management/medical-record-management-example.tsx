"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { 
  MedicalHistoryInputForm,
  type MedicalHistoryData,
  DocumentUploadManager,
  type DocumentMetadata,
  type DocumentItem,
  TreatmentTimeline,
  type TimelineEvent
} from "./index"

/**
 * Example component demonstrating the medical record management UI
 * This shows how to integrate the three main components:
 * 1. Medical History Input Form
 * 2. Document Upload Manager
 * 3. Treatment Timeline
 */
export function MedicalRecordManagementExample() {
  const [activeTab, setActiveTab] = React.useState<"history" | "documents" | "timeline">("history")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string>()

  // Example state for medical history
  const [medicalHistory, setMedicalHistory] = React.useState<MedicalHistoryData>({
    diagnosis: [],
    medications: [],
    allergies: []
  })

  // Example state for documents
  const [documents, setDocuments] = React.useState<DocumentItem[]>([])

  // Example state for timeline events
  const [timelineEvents, setTimelineEvents] = React.useState<TimelineEvent[]>([])

  // Handler for medical history submission
  const handleMedicalHistorySubmit = async (data: MedicalHistoryData) => {
    setIsLoading(true)
    setError(undefined)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMedicalHistory(data)
      
      // Add events to timeline
      const newEvents: TimelineEvent[] = []
      
      data.diagnosis.forEach(d => {
        newEvents.push({
          id: crypto.randomUUID(),
          date: new Date(d.diagnosedAt),
          type: "diagnosis",
          title: d.code,
          description: d.description,
          severity: d.severity
        })
      })
      
      data.medications.forEach(m => {
        newEvents.push({
          id: crypto.randomUUID(),
          date: new Date(m.startDate),
          type: "medication",
          title: m.name,
          description: `${m.dosage} - ${m.frequency}`,
          metadata: {
            prescribedBy: m.prescribedBy
          }
        })
      })
      
      data.allergies.forEach(a => {
        newEvents.push({
          id: crypto.randomUUID(),
          date: new Date(a.diagnosedAt),
          type: "allergy",
          title: a.allergen,
          description: a.reaction,
          severity: a.severity
        })
      })
      
      setTimelineEvents(prev => [...prev, ...newEvents])
      
      alert("Histórico médico salvo com sucesso!")
    } catch (err) {
      setError("Erro ao salvar histórico médico")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handler for document upload
  const handleDocumentUpload = async (file: File, metadata: DocumentMetadata) => {
    setIsLoading(true)
    setError(undefined)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const newDocument: DocumentItem = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        metadata,
        status: "validated",
        uploadedAt: new Date(),
        uploadedBy: "current-user-id"
      }
      
      setDocuments(prev => [...prev, newDocument])
      
      // Add to timeline
      const timelineEvent: TimelineEvent = {
        id: crypto.randomUUID(),
        date: new Date(),
        type: "progress_note",
        title: `Documento adicionado: ${metadata.title}`,
        description: `Tipo: ${metadata.documentType}`,
        metadata: {
          fileName: file.name,
          fileSize: file.size
        }
      }
      
      setTimelineEvents(prev => [...prev, timelineEvent])
      
      alert("Documento enviado com sucesso!")
    } catch (err) {
      setError("Erro ao enviar documento")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handler for document deletion
  const handleDocumentDelete = async (documentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) {
      return
    }

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      alert("Documento excluído com sucesso!")
    } catch (err) {
      setError("Erro ao excluir documento")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handler for document download
  const handleDocumentDownload = async (documentId: string) => {
    const doc = documents.find(d => d.id === documentId)
    if (!doc) return

    alert(`Download iniciado: ${doc.fileName}`)
    // In a real implementation, this would trigger a file download
  }

  // Handler for document view
  const handleDocumentView = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId)
    if (!doc) return

    alert(`Visualizando: ${doc.fileName}`)
    // In a real implementation, this would open a document viewer
  }

  // Handler for timeline event click
  const handleTimelineEventClick = (event: TimelineEvent) => {
    console.log("Timeline event clicked:", event)
    // In a real implementation, this could open a detail modal
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Gerenciamento de Prontuário Médico
        </h1>
        <p className="text-sm text-gray-600">
          Exemplo de integração dos componentes de histórico médico, documentos e linha do tempo
        </p>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Histórico Médico
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "documents"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Documentos ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "timeline"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Linha do Tempo ({timelineEvents.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "history" && (
          <MedicalHistoryInputForm
            initialData={medicalHistory}
            onSubmit={handleMedicalHistorySubmit}
            isLoading={isLoading}
            error={error}
          />
        )}

        {activeTab === "documents" && (
          <DocumentUploadManager
            documents={documents}
            onUpload={handleDocumentUpload}
            onDelete={handleDocumentDelete}
            onDownload={handleDocumentDownload}
            onView={handleDocumentView}
            isLoading={isLoading}
            error={error}
          />
        )}

        {activeTab === "timeline" && (
          <TreatmentTimeline
            events={timelineEvents}
            patientName="Paciente Exemplo"
            onEventClick={handleTimelineEventClick}
          />
        )}
      </div>

      {/* Summary Card */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Resumo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600">Diagnósticos</p>
            <p className="text-2xl font-bold text-gray-900">{medicalHistory.diagnosis.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Medicações</p>
            <p className="text-2xl font-bold text-gray-900">{medicalHistory.medications.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Alergias</p>
            <p className="text-2xl font-bold text-gray-900">{medicalHistory.allergies.length}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
