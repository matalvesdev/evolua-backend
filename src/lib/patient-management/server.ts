// ============================================================================
// PATIENT MANAGEMENT SERVER
// Server-side initialization and configuration
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { PatientManagementContainer } from './infrastructure/factories/PatientManagementContainer'
import { PatientManagementFacade } from './PatientManagementFacade'

/**
 * Initialize the patient management system for server-side use
 * Creates a new instance for each request to ensure proper isolation
 */
export async function initializePatientManagementServer() {
  const supabaseClient = await createClient()
  
  const container = PatientManagementContainer.initialize({
    supabaseClient,
    encryptionKey: process.env.ENCRYPTION_KEY,
    enableAuditLogging: true,
    enableSecurityMonitoring: true
  })

  return new PatientManagementFacade(container)
}

/**
 * Get patient management facade for server-side use
 * Creates a new instance for each call to ensure request isolation
 */
export async function getPatientManagementServer(): Promise<PatientManagementFacade> {
  return initializePatientManagementServer()
}
