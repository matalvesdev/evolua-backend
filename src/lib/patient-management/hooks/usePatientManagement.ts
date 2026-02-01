// ============================================================================
// USE PATIENT MANAGEMENT HOOK
// React hook for accessing patient management functionality
// ============================================================================

'use client'

import { useCallback, useEffect, useState } from 'react'
import { getPatientManagement, initializePatientManagement } from '../client'
import type { PatientManagementFacade } from '../PatientManagementFacade'

/**
 * React hook for accessing the patient management system
 * Automatically initializes the system on first use
 */
export function usePatientManagement() {
  const [facade, setFacade] = useState<PatientManagementFacade | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    try {
      // Try to get existing instance
      const existingFacade = getPatientManagement()
      setFacade(existingFacade)
      setIsInitialized(true)
    } catch {
      // Initialize if not already initialized
      try {
        const newFacade = initializePatientManagement()
        setFacade(newFacade)
        setIsInitialized(true)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize'))
      }
    }
  }, [])

  return {
    patientManagement: facade,
    isInitialized,
    error
  }
}

/**
 * Hook for patient operations
 */
export function usePatientOperations() {
  const { patientManagement } = usePatientManagement()

  const registerPatient = useCallback(
    async (patientData: any) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.registerPatient(patientData)
    },
    [patientManagement]
  )

  const updatePatient = useCallback(
    async (patientId: string, updates: any) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.updatePatient(patientId, updates)
    },
    [patientManagement]
  )

  const getPatient = useCallback(
    async (patientId: string) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.getPatient(patientId)
    },
    [patientManagement]
  )

  const searchPatients = useCallback(
    async (criteria: any) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.searchPatients(criteria)
    },
    [patientManagement]
  )

  const deletePatient = useCallback(
    async (patientId: string) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.deletePatient(patientId)
    },
    [patientManagement]
  )

  return {
    registerPatient,
    updatePatient,
    getPatient,
    searchPatients,
    deletePatient
  }
}

/**
 * Hook for medical record operations
 */
export function useMedicalRecordOperations() {
  const { patientManagement } = usePatientManagement()

  const createMedicalRecord = useCallback(
    async (patientId: string, recordData: any) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.createMedicalRecord(patientId, recordData)
    },
    [patientManagement]
  )

  const updateMedicalRecord = useCallback(
    async (recordId: string, updates: any) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.updateMedicalRecord(recordId, updates)
    },
    [patientManagement]
  )

  const getMedicalHistory = useCallback(
    async (patientId: string) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.getMedicalHistory(patientId)
    },
    [patientManagement]
  )

  const getTreatmentTimeline = useCallback(
    async (patientId: string) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.getTreatmentTimeline(patientId)
    },
    [patientManagement]
  )

  return {
    createMedicalRecord,
    updateMedicalRecord,
    getMedicalHistory,
    getTreatmentTimeline
  }
}

/**
 * Hook for document operations
 */
export function useDocumentOperations() {
  const { patientManagement } = usePatientManagement()

  const uploadDocument = useCallback(
    async (patientId: string, file: File, metadata?: any) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.uploadDocument(patientId, file, metadata)
    },
    [patientManagement]
  )

  const getDocument = useCallback(
    async (documentId: string) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.getDocument(documentId)
    },
    [patientManagement]
  )

  const listDocuments = useCallback(
    async (patientId: string) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.listDocuments(patientId)
    },
    [patientManagement]
  )

  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.deleteDocument(documentId)
    },
    [patientManagement]
  )

  return {
    uploadDocument,
    getDocument,
    listDocuments,
    deleteDocument
  }
}

/**
 * Hook for status operations
 */
export function useStatusOperations() {
  const { patientManagement } = usePatientManagement()

  const updatePatientStatus = useCallback(
    async (patientId: string, newStatus: any, reason?: string) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.updatePatientStatus(patientId, newStatus, reason)
    },
    [patientManagement]
  )

  const getStatusHistory = useCallback(
    async (patientId: string) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.getStatusHistory(patientId)
    },
    [patientManagement]
  )

  const getPatientsByStatus = useCallback(
    async (status: any) => {
      if (!patientManagement) throw new Error('Patient management not initialized')
      return patientManagement.getPatientsByStatus(status)
    },
    [patientManagement]
  )

  return {
    updatePatientStatus,
    getStatusHistory,
    getPatientsByStatus
  }
}
