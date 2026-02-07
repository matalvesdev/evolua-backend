// ============================================================================
// INTEGRATION DATA CONSISTENCY PROPERTY TESTS
// Property-based tests for data consistency across integrated systems
// Feature: patient-management-system, Property 10: Integration Data Consistency
// **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
// ============================================================================

import * as fc from 'fast-check'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { FullName } from '../../domain/value-objects/FullName'
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber'
import { Email } from '../../domain/value-objects/Email'
import { PatientStatus, PatientStatusType } from '../../domain/value-objects/PatientStatus'
import {
  patientIdGenerator,
  userIdGenerator,
  fullNameGenerator,
  phoneNumberGenerator,
  emailGenerator,
  patientStatusGenerator
} from '../../testing/generators'

// ============================================================================
// INTEGRATION DATA TYPES
// ============================================================================

interface PatientData {
  id: PatientId
  fullName: FullName
  phone: PhoneNumber
  email: Email | null
  status: PatientStatus
  updatedAt: Date
}

interface AppointmentData {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  patientEmail?: string
  status: string
  dateTime: Date
  updatedAt: Date
}

interface ReportData {
  id: string
  patientId: string
  patientName: string
  patientAge: number
  patientGender: string
  status: string
  generatedAt: Date
  updatedAt: Date
}

interface IntegrationUpdate {
  patientId: string
  changedFields: string[]
  newValues: Record<string, unknown>
  timestamp: Date
}

// ============================================================================
// MOCK PATIENT REPOSITORY
// ============================================================================

class MockPatientRepository {
  private patients: Map<string, PatientData> = new Map()

  async create(patient: PatientData): Promise<PatientData> {
    this.patients.set(patient.id.value, patient)
    return patient
  }

  async update(patientId: PatientId, updates: Partial<PatientData>): Promise<PatientData> {
    const patient = this.patients.get(patientId.value)
    if (!patient) {
      throw new Error(`Patient not found: ${patientId.value}`)
    }

    const updated = {
      ...patient,
      ...updates,
      updatedAt: new Date()
    }

    this.patients.set(patientId.value, updated)
    return updated
  }

  async findById(patientId: PatientId): Promise<PatientData | null> {
    return this.patients.get(patientId.value) || null
  }

  clear(): void {
    this.patients.clear()
  }
}

// ============================================================================
// MOCK APPOINTMENT INTEGRATION
// ============================================================================

class MockAppointmentIntegration {
  private appointments: Map<string, AppointmentData> = new Map()
  private patientAppointments: Map<string, string[]> = new Map()

  async linkPatientToAppointment(patientId: string, appointmentId: string, patientData: PatientData): Promise<void> {
    const appointment: AppointmentData = {
      id: appointmentId,
      patientId,
      patientName: patientData.fullName.value,
      patientPhone: patientData.phone.value,
      patientEmail: patientData.email?.value,
      status: 'scheduled',
      dateTime: new Date(),
      updatedAt: new Date()
    }

    this.appointments.set(appointmentId, appointment)

    const patientAppts = this.patientAppointments.get(patientId) || []
    patientAppts.push(appointmentId)
    this.patientAppointments.set(patientId, patientAppts)
  }

  async syncPatientData(patientId: string, patientData: PatientData): Promise<void> {
    const appointmentIds = this.patientAppointments.get(patientId) || []

    for (const appointmentId of appointmentIds) {
      const appointment = this.appointments.get(appointmentId)
      if (appointment) {
        appointment.patientName = patientData.fullName.value
        appointment.patientPhone = patientData.phone.value
        appointment.patientEmail = patientData.email?.value
        appointment.updatedAt = new Date()
        this.appointments.set(appointmentId, appointment)
      }
    }
  }

  async getPatientAppointments(patientId: string): Promise<AppointmentData[]> {
    const appointmentIds = this.patientAppointments.get(patientId) || []
    return appointmentIds
      .map(id => this.appointments.get(id))
      .filter((appt): appt is AppointmentData => appt !== undefined)
  }

  clear(): void {
    this.appointments.clear()
    this.patientAppointments.clear()
  }
}

// ============================================================================
// MOCK REPORT INTEGRATION
// ============================================================================

class MockReportIntegration {
  private reports: Map<string, ReportData> = new Map()
  private patientReports: Map<string, string[]> = new Map()

  async createReport(patientId: string, patientData: PatientData): Promise<string> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    
    const report: ReportData = {
      id: reportId,
      patientId,
      patientName: patientData.fullName.value,
      patientAge: 30, // Simplified for testing
      patientGender: 'male',
      status: 'draft',
      generatedAt: new Date(),
      updatedAt: new Date()
    }

    this.reports.set(reportId, report)

    const patientReps = this.patientReports.get(patientId) || []
    patientReps.push(reportId)
    this.patientReports.set(patientId, patientReps)

    return reportId
  }

  async propagatePatientDataChanges(patientId: string, patientData: PatientData, changedFields: string[]): Promise<void> {
    const reportIds = this.patientReports.get(patientId) || []

    for (const reportId of reportIds) {
      const report = this.reports.get(reportId)
      if (report && (report.status === 'draft' || report.status === 'pending_review')) {
        if (changedFields.includes('fullName')) {
          report.patientName = patientData.fullName.value
        }
        report.updatedAt = new Date()
        this.reports.set(reportId, report)
      }
    }
  }

  async getPatientReports(patientId: string): Promise<ReportData[]> {
    const reportIds = this.patientReports.get(patientId) || []
    return reportIds
      .map(id => this.reports.get(id))
      .filter((report): report is ReportData => report !== undefined)
  }

  async validateDataConsistency(patientId: string, patientData: PatientData): Promise<boolean> {
    const reports = await this.getPatientReports(patientId)
    
    return reports.every(report => 
      report.patientName === patientData.fullName.value &&
      report.patientId === patientId
    )
  }

  clear(): void {
    this.reports.clear()
    this.patientReports.clear()
  }
}

// ============================================================================
// MOCK INTEGRATION HUB
// ============================================================================

class MockIntegrationHub {
  constructor(
    private readonly patientRepository: MockPatientRepository,
    private readonly appointmentIntegration: MockAppointmentIntegration,
    private readonly reportIntegration: MockReportIntegration
  ) {}

  async updatePatientAndPropagate(
    patientId: PatientId,
    updates: Partial<PatientData>,
    changedFields: string[]
  ): Promise<void> {
    // Update patient data
    const updatedPatient = await this.patientRepository.update(patientId, updates)

    // Propagate to appointment system
    await this.appointmentIntegration.syncPatientData(patientId.value, updatedPatient)

    // Propagate to report system
    await this.reportIntegration.propagatePatientDataChanges(patientId.value, updatedPatient, changedFields)
  }

  async validateAllSystemsConsistency(patientId: PatientId): Promise<{
    consistent: boolean
    appointmentsConsistent: boolean
    reportsConsistent: boolean
    errors: string[]
  }> {
    const errors: string[] = []
    const patient = await this.patientRepository.findById(patientId)
    
    if (!patient) {
      return {
        consistent: false,
        appointmentsConsistent: false,
        reportsConsistent: false,
        errors: ['Patient not found']
      }
    }

    // Check appointment consistency
    const appointments = await this.appointmentIntegration.getPatientAppointments(patientId.value)
    const appointmentsConsistent = appointments.every(appt => 
      appt.patientId === patientId.value &&
      appt.patientName === patient.fullName.value &&
      appt.patientPhone === patient.phone.value &&
      (appt.patientEmail === patient.email?.value || (!appt.patientEmail && !patient.email))
    )

    if (!appointmentsConsistent) {
      errors.push('Appointment data inconsistent with patient data')
    }

    // Check report consistency
    const reportsConsistent = await this.reportIntegration.validateDataConsistency(patientId.value, patient)

    if (!reportsConsistent) {
      errors.push('Report data inconsistent with patient data')
    }

    return {
      consistent: appointmentsConsistent && reportsConsistent,
      appointmentsConsistent,
      reportsConsistent,
      errors
    }
  }
}

// ============================================================================
// GENERATORS
// ============================================================================

const appointmentIdGenerator = (): fc.Arbitrary<string> =>
  fc.uuid().map(uuid => `appt_${uuid}`)

const patientDataGenerator = (): fc.Arbitrary<PatientData> =>
  fc.record({
    id: patientIdGenerator(),
    fullName: fullNameGenerator(),
    phone: phoneNumberGenerator(),
    email: fc.option(emailGenerator()),
    status: patientStatusGenerator(),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).filter(d => !isNaN(d.getTime()))
  })

const patientUpdateGenerator = (): fc.Arbitrary<{
  updates: Partial<PatientData>
  changedFields: string[]
}> =>
  fc.oneof(
    // Update full name
    fullNameGenerator().map(fullName => ({
      updates: { fullName },
      changedFields: ['fullName']
    })),
    // Update phone
    phoneNumberGenerator().map(phone => ({
      updates: { phone },
      changedFields: ['phone']
    })),
    // Update email
    fc.option(emailGenerator()).map(email => ({
      updates: { email },
      changedFields: ['email']
    })),
    // Update status
    patientStatusGenerator().map(status => ({
      updates: { status },
      changedFields: ['status']
    })),
    // Update multiple fields
    fc.tuple(fullNameGenerator(), phoneNumberGenerator()).map(([fullName, phone]) => ({
      updates: { fullName, phone },
      changedFields: ['fullName', 'phone']
    }))
  )

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 10: Integration Data Consistency', () => {
  // ============================================================================
  // APPOINTMENT INTEGRATION CONSISTENCY TESTS
  // ============================================================================

  test('Property 10.1: Patient data updates propagate consistently to appointment system', () => {
    fc.assert(
      fc.asyncProperty(
        patientDataGenerator(),
        appointmentIdGenerator(),
        patientUpdateGenerator(),
        async (initialPatient, appointmentId, { updates, changedFields }) => {
          // Create fresh instances for this iteration
          const patientRepo = new MockPatientRepository()
          const appointmentIntegration = new MockAppointmentIntegration()
          const reportIntegration = new MockReportIntegration()
          const integrationHub = new MockIntegrationHub(patientRepo, appointmentIntegration, reportIntegration)

          // Create patient
          await patientRepo.create(initialPatient)

          // Link patient to appointment
          await appointmentIntegration.linkPatientToAppointment(
            initialPatient.id.value,
            appointmentId,
            initialPatient
          )

          // Update patient and propagate changes
          await integrationHub.updatePatientAndPropagate(initialPatient.id, updates, changedFields)

          // Verify appointment data is consistent
          const appointments = await appointmentIntegration.getPatientAppointments(initialPatient.id.value)
          expect(appointments.length).toBe(1)

          const appointment = appointments[0]
          const updatedPatient = await patientRepo.findById(initialPatient.id)
          expect(updatedPatient).not.toBeNull()

          // CRITICAL: Appointment data must match updated patient data
          expect(appointment.patientId).toBe(updatedPatient!.id.value)
          expect(appointment.patientName).toBe(updatedPatient!.fullName.value)
          expect(appointment.patientPhone).toBe(updatedPatient!.phone.value)
          
          if (updatedPatient!.email) {
            expect(appointment.patientEmail).toBe(updatedPatient!.email.value)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 10.2: Patient data updates propagate consistently to report system', () => {
    fc.assert(
      fc.asyncProperty(
        patientDataGenerator(),
        patientUpdateGenerator(),
        async (initialPatient, { updates, changedFields }) => {
          // Create fresh instances for this iteration
          const patientRepo = new MockPatientRepository()
          const appointmentIntegration = new MockAppointmentIntegration()
          const reportIntegration = new MockReportIntegration()
          const integrationHub = new MockIntegrationHub(patientRepo, appointmentIntegration, reportIntegration)

          // Create patient
          await patientRepo.create(initialPatient)

          // Create report for patient
          await reportIntegration.createReport(initialPatient.id.value, initialPatient)

          // Update patient and propagate changes
          await integrationHub.updatePatientAndPropagate(initialPatient.id, updates, changedFields)

          // Verify report data is consistent
          const reports = await reportIntegration.getPatientReports(initialPatient.id.value)
          expect(reports.length).toBe(1)

          const report = reports[0]
          const updatedPatient = await patientRepo.findById(initialPatient.id)
          expect(updatedPatient).not.toBeNull()

          // CRITICAL: Report data must match updated patient data
          expect(report.patientId).toBe(updatedPatient!.id.value)
          
          // Only check name consistency if name was updated
          if (changedFields.includes('fullName')) {
            expect(report.patientName).toBe(updatedPatient!.fullName.value)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // REFERENTIAL INTEGRITY TESTS
  // ============================================================================

  test('Property 10.3: Referential integrity is maintained across all integrated systems', () => {
    fc.assert(
      fc.asyncProperty(
        patientDataGenerator(),
        fc.array(appointmentIdGenerator(), { minLength: 1, maxLength: 5 }),
        async (patient, appointmentIds) => {
          // Create fresh instances for this iteration
          const patientRepo = new MockPatientRepository()
          const appointmentIntegration = new MockAppointmentIntegration()
          const reportIntegration = new MockReportIntegration()
          const integrationHub = new MockIntegrationHub(patientRepo, appointmentIntegration, reportIntegration)

          // Create patient
          await patientRepo.create(patient)

          // Link patient to multiple appointments
          for (const appointmentId of appointmentIds) {
            await appointmentIntegration.linkPatientToAppointment(patient.id.value, appointmentId, patient)
          }

          // Create multiple reports
          await reportIntegration.createReport(patient.id.value, patient)
          await reportIntegration.createReport(patient.id.value, patient)

          // Verify all appointments reference the correct patient
          const appointments = await appointmentIntegration.getPatientAppointments(patient.id.value)
          expect(appointments.length).toBe(appointmentIds.length)
          
          appointments.forEach(appointment => {
            expect(appointment.patientId).toBe(patient.id.value)
            expect(appointmentIds).toContain(appointment.id)
          })

          // Verify all reports reference the correct patient
          const reports = await reportIntegration.getPatientReports(patient.id.value)
          expect(reports.length).toBe(2)
          
          reports.forEach(report => {
            expect(report.patientId).toBe(patient.id.value)
          })

          // CRITICAL: Validate overall consistency
          const validation = await integrationHub.validateAllSystemsConsistency(patient.id)
          expect(validation.consistent).toBe(true)
          expect(validation.appointmentsConsistent).toBe(true)
          expect(validation.reportsConsistent).toBe(true)
          expect(validation.errors).toHaveLength(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // DATA FORMAT CONSISTENCY TESTS
  // ============================================================================

  test('Property 10.4: Patient data is properly formatted across all integrated systems', () => {
    fc.assert(
      fc.asyncProperty(
        patientDataGenerator(),
        appointmentIdGenerator(),
        async (patient, appointmentId) => {
          // Create fresh instances for this iteration
          const patientRepo = new MockPatientRepository()
          const appointmentIntegration = new MockAppointmentIntegration()
          const reportIntegration = new MockReportIntegration()

          // Create patient
          await patientRepo.create(patient)

          // Link to appointment
          await appointmentIntegration.linkPatientToAppointment(patient.id.value, appointmentId, patient)

          // Create report
          await reportIntegration.createReport(patient.id.value, patient)

          // Verify appointment data format
          const appointments = await appointmentIntegration.getPatientAppointments(patient.id.value)
          const appointment = appointments[0]

          // CRITICAL: Data must be properly formatted
          expect(typeof appointment.patientId).toBe('string')
          expect(typeof appointment.patientName).toBe('string')
          expect(typeof appointment.patientPhone).toBe('string')
          expect(appointment.patientName.length).toBeGreaterThan(0)
          expect(appointment.patientPhone.length).toBeGreaterThan(0)
          expect(appointment.updatedAt).toBeInstanceOf(Date)

          // Verify report data format
          const reports = await reportIntegration.getPatientReports(patient.id.value)
          const report = reports[0]

          expect(typeof report.patientId).toBe('string')
          expect(typeof report.patientName).toBe('string')
          expect(report.patientName.length).toBeGreaterThan(0)
          expect(report.generatedAt).toBeInstanceOf(Date)
          expect(report.updatedAt).toBeInstanceOf(Date)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // MULTIPLE UPDATE CONSISTENCY TESTS
  // ============================================================================

  test('Property 10.5: Multiple sequential updates maintain consistency across all systems', () => {
    fc.assert(
      fc.asyncProperty(
        patientDataGenerator(),
        appointmentIdGenerator(),
        fc.array(patientUpdateGenerator(), { minLength: 2, maxLength: 5 }),
        async (initialPatient, appointmentId, updates) => {
          // Create fresh instances for this iteration
          const patientRepo = new MockPatientRepository()
          const appointmentIntegration = new MockAppointmentIntegration()
          const reportIntegration = new MockReportIntegration()
          const integrationHub = new MockIntegrationHub(patientRepo, appointmentIntegration, reportIntegration)

          // Create patient
          await patientRepo.create(initialPatient)

          // Link to appointment and create report
          await appointmentIntegration.linkPatientToAppointment(initialPatient.id.value, appointmentId, initialPatient)
          await reportIntegration.createReport(initialPatient.id.value, initialPatient)

          // Apply multiple updates sequentially
          for (const { updates: updateData, changedFields } of updates) {
            await integrationHub.updatePatientAndPropagate(initialPatient.id, updateData, changedFields)
          }

          // Verify final consistency
          const validation = await integrationHub.validateAllSystemsConsistency(initialPatient.id)

          // CRITICAL: After multiple updates, all systems must still be consistent
          expect(validation.consistent).toBe(true)
          expect(validation.appointmentsConsistent).toBe(true)
          expect(validation.reportsConsistent).toBe(true)
          expect(validation.errors).toHaveLength(0)

          // Verify final patient data matches across all systems
          const finalPatient = await patientRepo.findById(initialPatient.id)
          const appointments = await appointmentIntegration.getPatientAppointments(initialPatient.id.value)
          const reports = await reportIntegration.getPatientReports(initialPatient.id.value)

          expect(finalPatient).not.toBeNull()
          expect(appointments[0].patientName).toBe(finalPatient!.fullName.value)
          expect(reports[0].patientName).toBe(finalPatient!.fullName.value)

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  // ============================================================================
  // CROSS-SYSTEM VALIDATION TESTS
  // ============================================================================

  test('Property 10.6: Data consistency validation detects inconsistencies across systems', () => {
    fc.assert(
      fc.asyncProperty(
        patientDataGenerator(),
        appointmentIdGenerator(),
        fullNameGenerator(),
        async (patient, appointmentId, differentName) => {
          // Create fresh instances for this iteration
          const patientRepo = new MockPatientRepository()
          const appointmentIntegration = new MockAppointmentIntegration()
          const reportIntegration = new MockReportIntegration()
          const integrationHub = new MockIntegrationHub(patientRepo, appointmentIntegration, reportIntegration)

          // Create patient
          await patientRepo.create(patient)

          // Link to appointment
          await appointmentIntegration.linkPatientToAppointment(patient.id.value, appointmentId, patient)

          // Create report
          await reportIntegration.createReport(patient.id.value, patient)

          // Initial validation should pass
          const initialValidation = await integrationHub.validateAllSystemsConsistency(patient.id)
          expect(initialValidation.consistent).toBe(true)

          // Manually corrupt appointment data (simulating inconsistency)
          const appointments = await appointmentIntegration.getPatientAppointments(patient.id.value)
          if (appointments.length > 0 && differentName.value !== patient.fullName.value) {
            appointments[0].patientName = differentName.value

            // Validation should now detect inconsistency
            const corruptedValidation = await integrationHub.validateAllSystemsConsistency(patient.id)
            
            // CRITICAL: Validation must detect the inconsistency
            expect(corruptedValidation.consistent).toBe(false)
            expect(corruptedValidation.appointmentsConsistent).toBe(false)
            expect(corruptedValidation.errors.length).toBeGreaterThan(0)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // COMPREHENSIVE INTEGRATION TESTS
  // ============================================================================

  test('Property 10.7: All connected systems receive consistent data for any patient update', () => {
    fc.assert(
      fc.asyncProperty(
        patientDataGenerator(),
        fc.array(appointmentIdGenerator(), { minLength: 1, maxLength: 3 }),
        patientUpdateGenerator(),
        async (patient, appointmentIds, { updates, changedFields }) => {
          // Create fresh instances for this iteration
          const patientRepo = new MockPatientRepository()
          const appointmentIntegration = new MockAppointmentIntegration()
          const reportIntegration = new MockReportIntegration()
          const integrationHub = new MockIntegrationHub(patientRepo, appointmentIntegration, reportIntegration)

          // Create patient
          await patientRepo.create(patient)

          // Link to multiple appointments
          for (const appointmentId of appointmentIds) {
            await appointmentIntegration.linkPatientToAppointment(patient.id.value, appointmentId, patient)
          }

          // Create multiple reports
          const reportId1 = await reportIntegration.createReport(patient.id.value, patient)
          const reportId2 = await reportIntegration.createReport(patient.id.value, patient)

          // Update patient and propagate
          await integrationHub.updatePatientAndPropagate(patient.id, updates, changedFields)

          // Get updated patient
          const updatedPatient = await patientRepo.findById(patient.id)
          expect(updatedPatient).not.toBeNull()

          // Verify ALL appointments have consistent data
          const appointments = await appointmentIntegration.getPatientAppointments(patient.id.value)
          expect(appointments.length).toBe(appointmentIds.length)

          appointments.forEach(appointment => {
            expect(appointment.patientId).toBe(updatedPatient!.id.value)
            expect(appointment.patientName).toBe(updatedPatient!.fullName.value)
            expect(appointment.patientPhone).toBe(updatedPatient!.phone.value)
          })

          // Verify ALL reports have consistent data (if name was updated)
          const reports = await reportIntegration.getPatientReports(patient.id.value)
          expect(reports.length).toBe(2)

          if (changedFields.includes('fullName')) {
            reports.forEach(report => {
              expect(report.patientId).toBe(updatedPatient!.id.value)
              expect(report.patientName).toBe(updatedPatient!.fullName.value)
            })
          }

          // CRITICAL: Overall consistency validation must pass
          const validation = await integrationHub.validateAllSystemsConsistency(patient.id)
          expect(validation.consistent).toBe(true)
          expect(validation.errors).toHaveLength(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // TIMESTAMP CONSISTENCY TESTS
  // ============================================================================

  test('Property 10.8: Update timestamps are properly maintained across all systems', () => {
    fc.assert(
      fc.asyncProperty(
        patientDataGenerator(),
        appointmentIdGenerator(),
        patientUpdateGenerator(),
        async (patient, appointmentId, { updates, changedFields }) => {
          // Create fresh instances for this iteration
          const patientRepo = new MockPatientRepository()
          const appointmentIntegration = new MockAppointmentIntegration()
          const reportIntegration = new MockReportIntegration()
          const integrationHub = new MockIntegrationHub(patientRepo, appointmentIntegration, reportIntegration)

          // Create patient
          await patientRepo.create(patient)

          // Link to appointment and create report
          await appointmentIntegration.linkPatientToAppointment(patient.id.value, appointmentId, patient)
          await reportIntegration.createReport(patient.id.value, patient)

          // Record time before update
          const beforeUpdate = new Date()

          // Small delay to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 10))

          // Update patient and propagate
          await integrationHub.updatePatientAndPropagate(patient.id, updates, changedFields)

          // Record time after update
          const afterUpdate = new Date()

          // Verify patient timestamp
          const updatedPatient = await patientRepo.findById(patient.id)
          expect(updatedPatient).not.toBeNull()
          expect(updatedPatient!.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
          expect(updatedPatient!.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime())

          // Verify appointment timestamp
          const appointments = await appointmentIntegration.getPatientAppointments(patient.id.value)
          expect(appointments[0].updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
          expect(appointments[0].updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime())

          // Verify report timestamp (if name was updated)
          if (changedFields.includes('fullName')) {
            const reports = await reportIntegration.getPatientReports(patient.id.value)
            expect(reports[0].updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
            expect(reports[0].updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime())
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})
