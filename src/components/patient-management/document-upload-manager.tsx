"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, File, X, Download, Eye, Trash2, FileText, Image as ImageIcon, FileCheck } from "lucide-react"

export type DocumentType =
  | "medical_report"
  | "prescription"
  | "exam_result"
  | "insurance_card"
  | "identification"
  | "consent_form"
  | "treatment_plan"
  | "progress_note"
  | "other"

export type DocumentStatus = "uploading" | "processing" | "validated" | "failed_validation" | "archived"

export interface DocumentMetadata {
  title: string
  description?: string
  documentType: DocumentType
  tags?: string[]
  isConfidential: boolean
}

export interface DocumentItem {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  metadata: DocumentMetadata
  status: DocumentStatus
  uploadedAt: Date
  uploadedBy: string
}

interface DocumentUploadManagerProps {
  documents?: DocumentItem[]
  onUpload: (file: File, metadata: DocumentMetadata) => Promise<void>
  onDelete?: (documentId: string) => Promise<void>
  onDownload?: (documentId: string) => Promise<void>
  onView?: (documentId: string) => void
  isLoading?: boolean
  error?: string
}

const documentTypeLabels: Record<DocumentType, string> = {
  medical_report: "Relatório Médico",
  prescription: "Receita",
  exam_result: "Resultado de Exame",
  insurance_card: "Carteira do Convênio",
  identification: "Identificação",
  consent_form: "Termo de Consentimento",
  treatment_plan: "Plano de Tratamento",
  progress_note: "Nota de Progresso",
  other: "Outro"
}

const statusLabels: Record<DocumentStatus, string> = {
  uploading: "Enviando",
  processing: "Processando",
  validated: "Validado",
  failed_validation: "Falha na Validação",
  archived: "Arquivado"
}

const statusColors: Record<DocumentStatus, string> = {
  uploading: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  validated: "bg-green-100 text-green-700",
  failed_validation: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-700"
}

export function DocumentUploadManager({
  documents = [],
  onUpload,
  onDelete,
  onDownload,
  onView,
  isLoading = false,
  error
}: DocumentUploadManagerProps) {
  const [showUploadForm, setShowUploadForm] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [metadata, setMetadata] = React.useState<DocumentMetadata>({
    title: "",
    description: "",
    documentType: "other",
    tags: [],
    isConfidential: false
  })
  const [tagInput, setTagInput] = React.useState("")
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({})
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!metadata.title) {
        setMetadata(prev => ({ ...prev, title: file.name }))
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!metadata.title) {
        setMetadata(prev => ({ ...prev, title: file.name }))
      }
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !metadata.tags?.includes(tagInput.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }))
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }))
  }

  const validateUpload = (): boolean => {
    const errors: Record<string, string> = {}

    if (!selectedFile) {
      errors.file = "Selecione um arquivo"
    }

    if (!metadata.title.trim()) {
      errors.title = "Título é obrigatório"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleUpload = async () => {
    if (!validateUpload() || !selectedFile) return

    try {
      await onUpload(selectedFile, metadata)
      
      // Reset form
      setSelectedFile(null)
      setMetadata({
        title: "",
        description: "",
        documentType: "other",
        tags: [],
        isConfidential: false
      })
      setShowUploadForm(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      console.error("Upload failed:", err)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="w-5 h-5" />
    if (fileType.includes("pdf")) return <FileText className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Documentos do Paciente</h3>
        <Button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Enviar Documento
        </Button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card className="p-6 space-y-4">
          <h4 className="font-medium text-gray-900">Novo Documento</h4>

          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              selectedFile
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-purple-500 hover:bg-purple-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <FileCheck className="w-12 h-12 mx-auto text-green-600" />
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Escolher Outro Arquivo
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <p className="text-sm text-gray-600">
                  Arraste um arquivo aqui ou{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    clique para selecionar
                  </button>
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOC, DOCX, JPG, PNG, GIF, TXT (máx. 50MB)
                </p>
              </div>
            )}
          </div>

          {validationErrors.file && (
            <p className="text-sm text-red-500">{validationErrors.file}</p>
          )}

          {/* Metadata Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="doc-title">Título *</Label>
              <Input
                id="doc-title"
                value={metadata.title}
                onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título do documento"
                className={validationErrors.title ? "border-red-500" : ""}
              />
              {validationErrors.title && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="doc-type">Tipo de Documento *</Label>
              <select
                id="doc-type"
                value={metadata.documentType}
                onChange={(e) => setMetadata(prev => ({ ...prev, documentType: e.target.value as DocumentType }))}
                className="w-full h-8 px-2.5 border border-gray-300 rounded-lg text-sm"
              >
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="doc-description">Descrição</Label>
              <Textarea
                id="doc-description"
                value={metadata.description}
                onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional do documento"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="doc-tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="doc-tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Adicionar tag"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Adicionar
                </Button>
              </div>
              {metadata.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {metadata.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-purple-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="doc-confidential"
                checked={metadata.isConfidential}
                onChange={(e) => setMetadata(prev => ({ ...prev, isConfidential: e.target.checked }))}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <Label htmlFor="doc-confidential" className="cursor-pointer">
                Documento Confidencial
              </Label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowUploadForm(false)
                setSelectedFile(null)
                setValidationErrors({})
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? "Enviando..." : "Enviar Documento"}
            </Button>
          </div>
        </Card>
      )}

      {/* Documents List */}
      <div className="space-y-3">
        {documents.length === 0 ? (
          <Card className="p-8 text-center">
            <File className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-600">Nenhum documento enviado ainda</p>
            <p className="text-xs text-gray-500 mt-1">
              Clique em &quot;Enviar Documento&quot; para adicionar arquivos
            </p>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 text-gray-600">
                  {getFileIcon(doc.fileType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {doc.metadata.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {doc.fileName} • {formatFileSize(doc.fileSize)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-600">
                          {documentTypeLabels[doc.metadata.documentType]}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[doc.status]}`}>
                          {statusLabels[doc.status]}
                        </span>
                        {doc.metadata.isConfidential && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                            Confidencial
                          </span>
                        )}
                      </div>
                      {doc.metadata.tags && doc.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.metadata.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {onView && doc.status === "validated" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onView(doc.id)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {onDownload && doc.status === "validated" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDownload(doc.id)}
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDelete(doc.id)}
                          title="Excluir"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {doc.metadata.description && (
                    <p className="text-xs text-gray-600 mt-2">
                      {doc.metadata.description}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
