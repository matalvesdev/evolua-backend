"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { type PatientStatusType } from "@/lib/core/domain/types"

export interface StatusTransitionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentStatus: PatientStatusType
  patientName: string
  patientId: string
  onStatusChange: (newStatus: PatientStatusType, reason?: string) => Promise<void>
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  active: { label: "Ativo", color: "text-green-700", icon: "check_circle" },
  "on-hold": { label: "Em Espera", color: "text-yellow-700", icon: "pause_circle" },
  discharged: { label: "Alta", color: "text-gray-700", icon: "task_alt" },
  inactive: { label: "Inativo", color: "text-red-700", icon: "cancel" },
}

// Status transition rules - which statuses can transition to which
const allowedTransitions: Record<string, PatientStatusType[]> = {
  active: ["on-hold", "discharged", "inactive"],
  "on-hold": ["active", "discharged", "inactive"],
  discharged: ["active", "inactive"],
  inactive: ["active"],
}

// Statuses that require a reason for transition
const requiresReason: Record<string, PatientStatusType[]> = {
  active: ["on-hold", "discharged", "inactive"],
  "on-hold": ["discharged", "inactive"],
  discharged: ["active"],
  inactive: ["active"],
}

export function StatusTransitionDialog({
  open,
  onOpenChange,
  currentStatus,
  patientName,
  onStatusChange,
}: StatusTransitionDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<PatientStatusType | "">("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentConfig = statusConfig[currentStatus] || { label: currentStatus, color: "text-gray-700", icon: "help" }
  const allowedStatuses = allowedTransitions[currentStatus] || []
  const needsReason = selectedStatus && requiresReason[currentStatus]?.includes(selectedStatus as PatientStatusType)

  const handleSubmit = async () => {
    if (!selectedStatus) {
      setError("Por favor, selecione um novo status")
      return
    }

    if (needsReason && !reason.trim()) {
      setError("Por favor, forneça um motivo para esta mudança de status")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onStatusChange(selectedStatus as PatientStatusType, reason || undefined)
      // Reset form
      setSelectedStatus("")
      setReason("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar status")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedStatus("")
    setReason("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">swap_horiz</span>
            Alterar Status do Paciente
          </DialogTitle>
          <DialogDescription>
            Altere o status de <span className="font-semibold text-foreground">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status Display */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <span className="material-symbols-outlined text-muted-foreground">info</span>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Status Atual</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`material-symbols-outlined text-lg ${currentConfig.color}`}>
                  {currentConfig.icon}
                </span>
                <span className="font-semibold">{currentConfig.label}</span>
              </div>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="new-status">Novo Status</Label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as PatientStatusType)}>
              <SelectTrigger id="new-status" className="w-full">
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                {allowedStatuses.map((status) => {
                  const config = statusConfig[status] || { label: status, color: "text-gray-700", icon: "help" }
                  return (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-base ${config.color}`}>
                          {config.icon}
                        </span>
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Reason Input (conditional) */}
          {selectedStatus && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="flex items-center gap-1">
                Motivo
                {needsReason && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  needsReason
                    ? "Descreva o motivo desta mudança de status (obrigatório)"
                    : "Descreva o motivo desta mudança de status (opcional)"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              {needsReason && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Esta transição requer um motivo
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedStatus}>
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-base mr-2">progress_activity</span>
                Alterando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base mr-2">check</span>
                Confirmar Alteração
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
