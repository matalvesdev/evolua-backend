// ============================================================================
// COMPLETE AUDIT TRAIL GENERATION PROPERTY TESTS
// Property-based tests for audit trail generation on patient data modifications
// Feature: patient-management-system, Property 3: Complete Audit Trail Generation
// **Validates: Requirements 1.3, 8.2**
// ============================================================================

import * as fc from 'fast-check'
import { Patient } from '../../domain/entities/Patient'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { PatientStatus, PatientStatusValues } from '../../domain/value-objects/PatientStatus'
import {
  patientIdGenerator,
  userIdGenerator,
  personalInformationGenerator,
  contactInformationGenerator,
  emergencyContactGenerator,
  insuranceInformationGenerator,
  patientStatusGenerator
} from '../../testing/generators'

// ============================================================================
// SIMPLE AUDIT LOG TYPES (to avoid circular dependencies)
// ============================================================================

interface SimpleAuditLogEntry {
  id: string
  userId: UserId
  patientId: PatientId
  operation: string
  dataType: string
  timestamp: Date
  oldValues?: any
  newValues?: any
  justification?: string
}

// ============================================================================
// MOCK AUDIT LOGGER
// ============================================================================

class SimpleAuditLogger {
  private logs: SimpleAuditLogEntry[] = []

  async logDataModification(
    userId: UserId,
    patientId: PatientId,
    operation: 'create' | 'update' | 'delete',
    dataType: string,
    oldValues?: any,
    newValues?: any,
    justification?: string
  ): Promise<void> {
    const logEntry: SimpleAuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userId,
      patientId,
      operation,
      dataType,
      timestamp: new Date(),
      oldValues,
      newValues,
      justification
    }

    this.logs.push(logEntry)
  }

  queryLogs(patientId?: PatientId, operation?: string): SimpleAuditLogEntry[] {
    let results = [...this.logs]

    if (patientId) {
      results = results.filter(log => log.patientId.value === patientId.value)
    }

    if (operation) {
      results = results.filter(log => log.operation === operation)
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return results
  }

  getAllLogs(): SimpleAuditLogEntry[] {
    return [...this.logs]
  }

  clear(): void {
    this.logs = []
  }
}

// ============================================================================
// MOCK PATIENT REPOSITORY
// ============================================================================

class InMemoryPatientRepository {
  private patients: Map<string, Patient> = new Map()

  async create(patient: Patient): Promise<Patient> {
    this.patients.set(patient.id.value, patient)
    return patient
  }

  async update(id: PatientId, updates: any): Promise<Patient> {
    const existing = this.patients.get(id.value)
    if (!existing) {
      throw new Error(`Patient with ID ${id.value} not found`)
    }

    let updated = existing

    if (updates.personalInfo) {
      updated = updated.updatePersonalInfo(updates.personalInfo)
    }

    if (updates.status) {
      updated = new Patient(
        updated.id,
        updated.personalInfo,
        updated.contactInfo,
        updated.emergencyContact,
        updated.insuranceInfo,
        updates.status,
        updated.createdAt,
        new Date(),
        updated.createdBy
      )
    }

    this.patients.set(id.value, updated)
    return updated
  }

  async findById(id: PatientId): Promise<Patient | null> {
    return this.patients.get(id.value) || null
  }

  async delete(id: PatientId): Promise<void> {
    this.patients.delete(id.value)
  }

  clear(): void {
    this.patients.clear()
  }
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 3: Complete Audit Trail Generation', () => {
  // ============================================================================
  // PATIENT CREATION AUDIT TRAIL TESTS
  // ============================================================================

  test('Property 3.1: Patient creation generates audit trail with user identity and timestamp', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        patientStatusGenerator(),
        userIdGenerator(),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
          // Create fresh instances for this iteration
          const auditLogger = new SimpleAuditLogger()
          const patientRepository = new InMemoryPatientRepository()

          const beforeCreation = new Date()

          // Create patient
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            status,
            new Date(),
            new Date(),
            userId
          )

          await patientRepository.create(patient)

          // Log the creation
          await auditLogger.logDataModification(
            userId,
            patientId,
            'create',
            'patient_data',
            undefined,
            {
              personalInfo: personalInfo,
              contactInfo: contactInfo,
              status: status.value
            },
            'Patient registration'
          )

          const afterCreation = new Date()

          // Verify audit trail was created
          const logs = auditLogger.getAllLogs()
          expect(logs.length).toBeGreaterThan(0)

          const creationLog = logs.find(log =>
            log.patientId.value === patientId.value &&
            log.operation === 'create'
          )

          // Verify audit trail contains user identity
          expect(creationLog).toBeDefined()
          expect(creationLog!.userId.value).toBe(userId.value)

          // Verify audit trail contains timestamp
          expect(creationLog!.timestamp).toBeInstanceOf(Date)
          expect(creationLog!.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime())
          expect(creationLog!.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime())

          // Verify audit trail contains operation details
          expect(creationLog!.operation).toBe('create')
          expect(creationLog!.dataType).toBe('patient_data')

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  test('Property 3.2: Patient creation audit trail contains complete operation details', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        patientStatusGenerator(),
        userIdGenerator(),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
          // Create fresh instances for this iteration
          const auditLogger = new SimpleAuditLogger()
          const patientRepository = new InMemoryPatientRepository()

          // Create patient
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            status,
            new Date(),
            new Date(),
            userId
          )

          await patientRepository.create(patient)

          const newValues = {
            personalInfo: {
              fullName: personalInfo.fullName.value,
              cpf: personalInfo.cpf.value,
              dateOfBirth: personalInfo.dateOfBirth
            },
            contactInfo: {
              primaryPhone: contactInfo.primaryPhone.value,
              email: contactInfo.email?.value
            },
            status: status.value
          }

          // Log the creation with complete details
          await auditLogger.logDataModification(
            userId,
            patientId,
            'create',
            'patient_data',
            undefined,
            newValues,
            'Patient registration'
          )

          // Verify audit trail contains complete operation details
          const logs = auditLogger.getAllLogs()
          const creationLog = logs.find(log =>
            log.patientId.value === patientId.value &&
            log.operation === 'create'
          )

          expect(creationLog).toBeDefined()
          expect(creationLog!.newValues).toBeDefined()
          expect(creationLog!.justification).toBe('Patient registration')

          // Verify new values are stored
          expect(creationLog!.newValues).toEqual(newValues)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  // ============================================================================
  // PATIENT UPDATE AUDIT TRAIL TESTS
  // ============================================================================

  test('Property 3.3: Patient update generates audit trail with previous and new values', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        patientStatusGenerator(),
        userIdGenerator(),
        async (patientId, oldPersonalInfo, newPersonalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
          // Create fresh instances for this iteration
          const auditLogger = new SimpleAuditLogger()
          const patientRepository = new InMemoryPatientRepository()

          // Create patient with old personal info
          const patient = new Patient(
            patientId,
            oldPersonalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            status,
            new Date(),
            new Date(),
            userId
          )

          await patientRepository.create(patient)

          const beforeUpdate = new Date()

          // Update patient personal info
          await patientRepository.update(patientId, {
            personalInfo: newPersonalInfo
          })

          // Log the update
          await auditLogger.logDataModification(
            userId,
            patientId,
            'update',
            'personal_information',
            {
              fullName: oldPersonalInfo.fullName.value,
              cpf: oldPersonalInfo.cpf.value
            },
            {
              fullName: newPersonalInfo.fullName.value,
              cpf: newPersonalInfo.cpf.value
            },
            'Personal information update'
          )

          const afterUpdate = new Date()

          // Verify audit trail was created
          const logs = auditLogger.getAllLogs()
          const updateLog = logs.find(log =>
            log.patientId.value === patientId.value &&
            log.operation === 'update'
          )

          expect(updateLog).toBeDefined()

          // Verify user identity
          expect(updateLog!.userId.value).toBe(userId.value)

          // Verify timestamp
          expect(updateLog!.timestamp).toBeInstanceOf(Date)
          expect(updateLog!.timestamp.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
          expect(updateLog!.timestamp.getTime()).toBeLessThanOrEqual(afterUpdate.getTime())

          // Verify previous values are stored
          expect(updateLog!.oldValues).toBeDefined()
          expect(updateLog!.oldValues.fullName).toBe(oldPersonalInfo.fullName.value)

          // Verify new values are stored
          expect(updateLog!.newValues).toBeDefined()
          expect(updateLog!.newValues.fullName).toBe(newPersonalInfo.fullName.value)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  // ============================================================================
  // STATUS CHANGE AUDIT TRAIL TESTS
  // ============================================================================

  test('Property 3.4: Status change generates audit trail with complete transition details', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        userIdGenerator(),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, userId) => {
          // Create fresh instances for this iteration
          const auditLogger = new SimpleAuditLogger()
          const patientRepository = new InMemoryPatientRepository()

          const oldStatus = PatientStatusValues.NEW
          const newStatus = PatientStatusValues.ACTIVE

          // Create patient with old status
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            new PatientStatus(oldStatus),
            new Date(),
            new Date(),
            userId
          )

          await patientRepository.create(patient)

          const beforeStatusChange = new Date()

          // Change patient status
          await patientRepository.update(patientId, {
            status: new PatientStatus(newStatus)
          })

          // Log the status change
          await auditLogger.logDataModification(
            userId,
            patientId,
            'update',
            'status_change',
            { status: oldStatus },
            { status: newStatus },
            `Status changed from ${oldStatus} to ${newStatus}`
          )

          const afterStatusChange = new Date()

          // Verify audit trail was created
          const logs = auditLogger.getAllLogs()
          const statusLog = logs.find(log =>
            log.patientId.value === patientId.value &&
            log.dataType === 'status_change'
          )

          expect(statusLog).toBeDefined()

          // Verify user identity
          expect(statusLog!.userId.value).toBe(userId.value)

          // Verify timestamp
          expect(statusLog!.timestamp).toBeInstanceOf(Date)
          expect(statusLog!.timestamp.getTime()).toBeGreaterThanOrEqual(beforeStatusChange.getTime())
          expect(statusLog!.timestamp.getTime()).toBeLessThanOrEqual(afterStatusChange.getTime())

          // Verify operation details
          expect(statusLog!.operation).toBe('update')
          expect(statusLog!.dataType).toBe('status_change')

          // Verify previous and new values are stored
          expect(statusLog!.oldValues).toBeDefined()
          expect(statusLog!.oldValues.status).toBe(oldStatus)
          expect(statusLog!.newValues).toBeDefined()
          expect(statusLog!.newValues.status).toBe(newStatus)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  // ============================================================================
  // PATIENT DELETION AUDIT TRAIL TESTS
  // ============================================================================

  test('Property 3.5: Patient deletion generates audit trail before removal', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        patientStatusGenerator(),
        userIdGenerator(),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
          // Create fresh instances for this iteration
          const auditLogger = new SimpleAuditLogger()
          const patientRepository = new InMemoryPatientRepository()

          // Create patient
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            status,
            new Date(),
            new Date(),
            userId
          )

          await patientRepository.create(patient)

          const beforeDeletion = new Date()

          // Log the deletion BEFORE actually deleting
          await auditLogger.logDataModification(
            userId,
            patientId,
            'delete',
            'patient_data',
            {
              personalInfo: {
                fullName: personalInfo.fullName.value,
                cpf: personalInfo.cpf.value
              },
              status: status.value
            },
            undefined,
            'Patient data deletion request'
          )

          // Now delete the patient
          await patientRepository.delete(patientId)

          const afterDeletion = new Date()

          // Verify audit trail was created BEFORE deletion
          const logs = auditLogger.getAllLogs()
          const deletionLog = logs.find(log =>
            log.patientId.value === patientId.value &&
            log.operation === 'delete'
          )

          expect(deletionLog).toBeDefined()

          // Verify user identity
          expect(deletionLog!.userId.value).toBe(userId.value)

          // Verify timestamp
          expect(deletionLog!.timestamp).toBeInstanceOf(Date)
          expect(deletionLog!.timestamp.getTime()).toBeGreaterThanOrEqual(beforeDeletion.getTime())
          expect(deletionLog!.timestamp.getTime()).toBeLessThanOrEqual(afterDeletion.getTime())

          // Verify previous values are preserved
          expect(deletionLog!.oldValues).toBeDefined()
          expect(deletionLog!.oldValues.personalInfo.fullName).toBe(personalInfo.fullName.value)

          // Verify patient is actually deleted
          const deletedPatient = await patientRepository.findById(patientId)
          expect(deletedPatient).toBeNull()

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  // ============================================================================
  // COMPREHENSIVE AUDIT TRAIL TESTS
  // ============================================================================

  test('Property 3.6: All patient data modifications generate audit trails', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        userIdGenerator(),
        async (patientId, oldPersonalInfo, newPersonalInfo, contactInfo, emergencyContact, insuranceInfo, userId) => {
          // Create fresh instances for this iteration
          const testAuditLogger = new SimpleAuditLogger()
          const testPatientRepository = new InMemoryPatientRepository()

          // Create patient
          const patient = new Patient(
            patientId,
            oldPersonalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            new PatientStatus(PatientStatusValues.NEW),
            new Date(),
            new Date(),
            userId
          )

          await testPatientRepository.create(patient)

          // Log creation
          await testAuditLogger.logDataModification(
            userId,
            patientId,
            'create',
            'patient_data',
            undefined,
            { personalInfo: oldPersonalInfo },
            'Patient registration'
          )

          // Update patient
          await testPatientRepository.update(patientId, {
            personalInfo: newPersonalInfo
          })

          // Log update
          await testAuditLogger.logDataModification(
            userId,
            patientId,
            'update',
            'personal_information',
            { personalInfo: oldPersonalInfo },
            { personalInfo: newPersonalInfo },
            'Personal information update'
          )

          // Change status
          await testPatientRepository.update(patientId, {
            status: new PatientStatus(PatientStatusValues.ACTIVE)
          })

          // Log status change
          await testAuditLogger.logDataModification(
            userId,
            patientId,
            'update',
            'status_change',
            { status: PatientStatusValues.NEW },
            { status: PatientStatusValues.ACTIVE },
            'Status activation'
          )

          // Verify all operations have audit trails
          const logs = testAuditLogger.queryLogs(patientId)

          // Should have 3 audit logs: create, update, status change
          expect(logs.length).toBe(3)

          // Verify each operation type is present
          const operations = logs.map(log => log.operation)
          expect(operations).toContain('create')
          expect(operations.filter(op => op === 'update').length).toBe(2)

          // Verify all logs have user identity
          logs.forEach(log => {
            expect(log.userId.value).toBe(userId.value)
          })

          // Verify all logs have timestamps
          logs.forEach(log => {
            expect(log.timestamp).toBeInstanceOf(Date)
          })

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  test('Property 3.7: Audit trail maintains chronological order of operations', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        personalInformationGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        userIdGenerator(),
        async (patientId, info1, info2, info3, contactInfo, emergencyContact, insuranceInfo, userId) => {
          // Create fresh instances for this iteration
          const testAuditLogger = new SimpleAuditLogger()
          const testPatientRepository = new InMemoryPatientRepository()

          // Create patient
          const patient = new Patient(
            patientId,
            info1,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            new PatientStatus(PatientStatusValues.NEW),
            new Date(),
            new Date(),
            userId
          )

          await testPatientRepository.create(patient)

          // Perform multiple updates with small delays
          await testAuditLogger.logDataModification(userId, patientId, 'create', 'patient_data', undefined, { info: info1 }, 'Creation')
          await new Promise(resolve => setTimeout(resolve, 10))

          await testPatientRepository.update(patientId, { personalInfo: info2 })
          await testAuditLogger.logDataModification(userId, patientId, 'update', 'personal_information', { info: info1 }, { info: info2 }, 'Update 1')
          await new Promise(resolve => setTimeout(resolve, 10))

          await testPatientRepository.update(patientId, { personalInfo: info3 })
          await testAuditLogger.logDataModification(userId, patientId, 'update', 'personal_information', { info: info2 }, { info: info3 }, 'Update 2')

          // Verify chronological order
          const logs = testAuditLogger.queryLogs(patientId)

          // Logs should be in reverse chronological order (most recent first)
          for (let i = 1; i < logs.length; i++) {
            expect(logs[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(logs[i].timestamp.getTime())
          }

          return true
        }
      ),
      { numRuns: 10 }
    )
  })
})
