// ============================================================================
// PATIENT MANAGEMENT CLIENT
// Client-side initialization and configuration
// ============================================================================

import { createClient } from '@/lib/supabase/client'
import { PatientManagementContainer } from './infrastructure/factories/PatientManagementContainer'
import { PatientManagementFacade } from './PatientManagementFacade'

/**
 * Initialize the patient management system for client-side use
 * Call this once at application startup
 */
export function initializePatientManagement() {
  const supabaseClient = createClient()
  
  const container = PatientManagementContainer.initialize({
    supabaseClient,
    encryptionKey: process.env.NEXT_PUBLIC_ENCRYPTION_KEY,
    enableAuditLogging: true,
    enableSecurityMonitoring: true
  })

  return new PatientManagementFacade(container)
}

/**
 * Get the patient management facade instance
 * Throws error if not initialized
 */
export function getPatientManagement(): PatientManagementFacade {
  try {
    const container = PatientManagementContainer.getInstance()
    return new PatientManagementFacade(container)
  } catch (error) {
    throw new Error(
      'Patient Management System not initialized. Call initializePatientManagement() first.'
    )
  }
}

/**
 * Reset the patient management system (useful for testing)
 */
export function resetPatientManagement(): void {
  PatientManagementContainer.reset()
}
