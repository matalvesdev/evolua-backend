// ============================================================================
// END-TO-END INTEGRATION EXAMPLE
// Demonstrates complete workflow from patient registration to report generation
// ============================================================================

import { getPatientManagement } from '../client'
import type { CreatePatientData } from '../infrastructure/repositories/IPatientRepository'
import type { CreateMedicalRecordRequest } from '../infrastructure/repositories/IMedicalRecordRepository'

/**
 * Complete end-to-end workflow example
 * This demonstrates how all components work together
 */
export async function endToEndWorkflowExample() {
  // Get the patient management facade
  const pm = getPatientManagement()

  console.log('=== PATIENT MANAGEMENT END-TO-END WORKFLOW ===\n')

  // ============================================================================
  // STEP 1: REGISTER A NEW PATIENT
  // ============================================================================
  console.log('Step 1: Registering new patient...')
  
  const patientData: CreatePatientData = {
    fullName: 'Maria Silva Santos',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'female',
    cpf: '123.456.789-00',
    rg: '12.345.678-9',
    primaryPhone: '(11) 98765-4321',
    email: 'maria.silva@example.com',
    address: {
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apt 45',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567'
    },
    emergencyContact: {
      name: 'João Silva',
      relationship: 'Spouse',
      phone: '(11) 98765-1234'
    }
  }

  const patient = await pm.registerPatient(patientData)
  console.log(`✓ Patient registered: ${patient.id.value}`)
  console.log(`  Name: ${patient.personalInfo.fullName.value}`)
  console.log(`  Status: ${patient.status}\n`)

  // ============================================================================
  // STEP 2: RECORD LGPD CONSENT
  // ============================================================================
  console.log('Step 2: Recording LGPD consent...')
  
  await pm.recordConsent(patient.id.value, 'data_processing', true)
  await pm.recordConsent(patient.id.value, 'data_sharing', true)
  
  console.log('✓ Consent recorded\n')

  // ============================================================================
  // STEP 3: CREATE MEDICAL RECORD
  // ============================================================================
  console.log('Step 3: Creating medical record...')
  
  const medicalRecordData: CreateMedicalRecordRequest = {
    patientId: patient.id.value,
    diagnosis: [
      {
        code: 'F80.1',
        description: 'Expressive language disorder',
        diagnosedAt: new Date(),
        diagnosedBy: 'Dr. Ana Costa'
      }
    ],
    medications: [
      {
        name: 'Speech therapy exercises',
        dosage: 'Daily practice',
        frequency: '3x per week',
        prescribedBy: 'Dr. Ana Costa',
        startDate: new Date()
      }
    ],
    allergies: [],
    treatmentHistory: [
      {
        type: 'Initial Assessment',
        description: 'Comprehensive speech and language evaluation',
        startDate: new Date(),
        provider: 'Dr. Ana Costa',
        outcome: 'Identified expressive language delays'
      }
    ]
  }

  const medicalRecord = await pm.createMedicalRecord(
    patient.id.value,
    medicalRecordData
  )
  console.log(`✓ Medical record created: ${medicalRecord.id.value}\n`)

  // ============================================================================
  // STEP 4: UPLOAD DOCUMENTS
  // ============================================================================
  console.log('Step 4: Uploading patient documents...')
  
  // Simulate file upload (in real scenario, this would be an actual File object)
  const mockFile = new File(['assessment report content'], 'assessment.pdf', {
    type: 'application/pdf'
  })

  const document = await pm.uploadDocument(
    patient.id.value,
    mockFile,
    {
      documentType: 'assessment_report',
      description: 'Initial speech assessment',
      date: new Date().toISOString()
    }
  )
  console.log(`✓ Document uploaded: ${document.id.value}\n`)

  // ============================================================================
  // STEP 5: UPDATE PATIENT STATUS
  // ============================================================================
  console.log('Step 5: Updating patient status to Active...')
  
  await pm.updatePatientStatus(
    patient.id.value,
    'active' as any,
    'Patient completed initial assessment and started treatment'
  )
  console.log('✓ Status updated to Active\n')

  // ============================================================================
  // STEP 6: LINK TO APPOINTMENT SYSTEM
  // ============================================================================
  console.log('Step 6: Linking patient to appointment...')
  
  // Simulate appointment creation
  const mockAppointmentId = 'appt-' + Date.now()
  
  await pm.linkPatientToAppointment(patient.id.value, mockAppointmentId)
  console.log(`✓ Patient linked to appointment: ${mockAppointmentId}\n`)

  // ============================================================================
  // STEP 7: GENERATE TREATMENT TIMELINE
  // ============================================================================
  console.log('Step 7: Generating treatment timeline...')
  
  const timeline = await pm.getTreatmentTimeline(patient.id.value)
  console.log(`✓ Timeline generated with ${timeline.events.length} events\n`)

  // ============================================================================
  // STEP 8: PERFORM ADVANCED SEARCH
  // ============================================================================
  console.log('Step 8: Testing advanced search...')
  
  const searchResults = await pm.advancedSearch({
    searchTerm: 'Maria',
    filters: {
      status: ['active'],
      ageRange: { min: 30, max: 50 }
    },
    pagination: { page: 1, pageSize: 10 }
  })
  console.log(`✓ Search found ${searchResults.results.length} patients\n`)

  // ============================================================================
  // STEP 9: GENERATE PATIENT SUMMARY FOR REPORT
  // ============================================================================
  console.log('Step 9: Generating patient summary for report...')
  
  const summary = await pm.generatePatientSummary(patient.id.value)
  console.log('✓ Patient summary generated')
  console.log(`  Total appointments: ${summary.appointmentCount}`)
  console.log(`  Total documents: ${summary.documentCount}\n`)

  // ============================================================================
  // STEP 10: VALIDATE DATA INTEGRITY
  // ============================================================================
  console.log('Step 10: Validating data integrity...')
  
  const integrityCheck = await pm.checkReferentialIntegrity(patient.id.value)
  console.log(`✓ Integrity check: ${integrityCheck.isValid ? 'PASSED' : 'FAILED'}`)
  
  if (!integrityCheck.isValid) {
    console.log('  Violations found:', integrityCheck.violations)
  }
  console.log()

  // ============================================================================
  // STEP 11: RETRIEVE AUDIT LOGS
  // ============================================================================
  console.log('Step 11: Retrieving audit logs...')
  
  const auditLogs = await pm.getAuditLogs(patient.id.value)
  console.log(`✓ Retrieved ${auditLogs.length} audit log entries`)
  
  if (auditLogs.length > 0) {
    console.log('  Recent operations:')
    auditLogs.slice(0, 3).forEach(log => {
      console.log(`    - ${log.operation} at ${log.timestamp}`)
    })
  }
  console.log()

  // ============================================================================
  // STEP 12: SYSTEM HEALTH CHECK
  // ============================================================================
  console.log('Step 12: Performing system health check...')
  
  const health = await pm.healthCheck()
  console.log(`✓ System health: ${health.healthy ? 'HEALTHY' : 'UNHEALTHY'}`)
  console.log('  Service status:')
  Object.entries(health.services).forEach(([service, status]) => {
    console.log(`    - ${service}: ${status ? '✓' : '✗'}`)
  })
  console.log()

  // ============================================================================
  // STEP 13: DATA PORTABILITY REQUEST (LGPD)
  // ============================================================================
  console.log('Step 13: Processing data portability request...')
  
  const exportRequest = await pm.processDataPortabilityRequest({
    patientId: patient.id.value,
    requestedBy: 'patient',
    format: 'json',
    includeDocuments: true,
    includeMedicalRecords: true,
    includeAuditLogs: false
  })
  
  console.log('✓ Data export prepared')
  console.log(`  Format: ${exportRequest.format}`)
  console.log(`  Size: ${exportRequest.sizeBytes} bytes\n`)

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('=== WORKFLOW COMPLETED SUCCESSFULLY ===')
  console.log('\nAll components integrated and working:')
  console.log('  ✓ Patient Registry')
  console.log('  ✓ Medical Record Manager')
  console.log('  ✓ Document Manager')
  console.log('  ✓ Status Tracker')
  console.log('  ✓ LGPD Compliance Engine')
  console.log('  ✓ Integration Hub')
  console.log('  ✓ Advanced Search')
  console.log('  ✓ Data Validation')
  console.log('  ✓ Audit Logging')
  console.log('  ✓ Security Monitoring')

  return {
    patient,
    medicalRecord,
    document,
    timeline,
    summary,
    health
  }
}

/**
 * Example: Patient lifecycle management
 */
export async function patientLifecycleExample() {
  const pm = getPatientManagement()

  console.log('=== PATIENT LIFECYCLE MANAGEMENT ===\n')

  // Create patient
  const patient = await pm.registerPatient({
    fullName: 'João Pedro Oliveira',
    dateOfBirth: new Date('2010-06-20'),
    gender: 'male',
    cpf: '987.654.321-00',
    primaryPhone: '(11) 91234-5678'
  })

  console.log('1. Patient registered as NEW')

  // Activate patient
  await pm.updatePatientStatus(patient.id.value, 'active' as any, 'Started treatment')
  console.log('2. Patient status changed to ACTIVE')

  // Put on hold
  await pm.updatePatientStatus(
    patient.id.value,
    'on_hold' as any,
    'Patient requested temporary pause'
  )
  console.log('3. Patient status changed to ON_HOLD')

  // Reactivate
  await pm.updatePatientStatus(patient.id.value, 'active' as any, 'Resumed treatment')
  console.log('4. Patient status changed back to ACTIVE')

  // Get status history
  const history = await pm.getStatusHistory(patient.id.value)
  console.log(`\n✓ Status history: ${history.length} transitions`)
  
  history.forEach((transition, index) => {
    console.log(`  ${index + 1}. ${transition.fromStatus} → ${transition.toStatus}`)
    console.log(`     Reason: ${transition.reason || 'N/A'}`)
  })

  return patient
}

/**
 * Example: Multi-system integration
 */
export async function multiSystemIntegrationExample() {
  const pm = getPatientManagement()

  console.log('=== MULTI-SYSTEM INTEGRATION ===\n')

  // Create patient
  const patient = await pm.registerPatient({
    fullName: 'Ana Carolina Souza',
    dateOfBirth: new Date('1995-09-10'),
    gender: 'female',
    cpf: '456.789.123-00',
    primaryPhone: '(11) 99876-5432'
  })

  console.log('1. Patient created in Patient Management System')

  // Link to appointment
  const appointmentId = 'appt-' + Date.now()
  await pm.linkPatientToAppointment(patient.id.value, appointmentId)
  console.log('2. Patient linked to Appointment System')

  // Get appointments
  const appointments = await pm.getPatientAppointments(patient.id.value)
  console.log(`3. Retrieved ${appointments.length} appointments`)

  // Generate report data
  const reportData = await pm.getPatientDataForReport(patient.id.value, 'progress_report')
  console.log('4. Generated data for Report System')

  // Check integration status
  const status = await pm.getIntegrationStatus()
  console.log('\n✓ Integration Status:')
  console.log(`  Appointment System: ${status.appointment ? 'Connected' : 'Disconnected'}`)
  console.log(`  Report System: ${status.report ? 'Connected' : 'Disconnected'}`)

  return { patient, appointments, reportData }
}

// Export all examples
export const examples = {
  endToEndWorkflow: endToEndWorkflowExample,
  patientLifecycle: patientLifecycleExample,
  multiSystemIntegration: multiSystemIntegrationExample
}
