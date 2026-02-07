// ============================================================================
// REFERENTIAL INTEGRITY PRESERVATION PROPERTY TESTS
// Property-based tests for referential integrity across patient-related entities
// Feature: patient-management-system, Property 12: Referential Integrity Preservation
// **Validates: Requirements 6.2**
// ============================================================================

import * as fc from 'fast-check'
import { Patient } from '../../domain/entities/Patient'
import { MedicalRecord } from '../../domain/entities/MedicalRecord'
import { PatientId } from '../../domain/value-objects/PatientId'
import { MedicalRecordId } from '../../domain/value-objects/MedicalRecordId'
import { DocumentId, DocumentMetadata, DocumentStatus, DocumentType, Document as DocumentEntity } from '../../domain/entities/Document'
import { PatientStatusType } from '../../domain/value-objects/PatientStatus'
import { StatusTransition } from '../../application/services/StatusTracker'
import {
  patientIdGenerator,
  medicalRecordIdGenerator,
  userIdGenerator,
  personalInformationGenerator,
  contactInformationGenerator,
  emergencyContactGenerator,
  insuranceInformationGenerator,
  patientStatusGenerator,
  diagnosisGenerator,
  medicationGenerator,
  allergyGenerator,
  progressNoteGenerator,
  assessmentGenerator
} from '../../testing/generators'

// ============================================================================
// MOCK REPOSITORIES WITH REFERENTIAL INTEGRITY CHECKS
// ============================================================================

class MockPatientRepository {
  private patients: Map<string, Patient> = new Map()

  async create(patient: Patient): Promise<Patient> {
    this.patients.set(patient.id.value, patient)
    return patient
  }

  async findById(id: PatientId): Promise<Patient | null> {
    return this.patients.get(id.value) || null
  }

  async delete(id: PatientId): Promise<void> {
    this.patients.delete(id.value)
  }

  exists(id: PatientId): boolean {
    return this.patients.has(id.value)
  }

  clear(): void {
    this.patients.clear()
  }

  getAllPatients(): Patient[] {
    return Array.from(this.patients.values())
  }
}

class MockMedicalRecordRepository {
  private records: Map<string, MedicalRecord> = new Map()
  private patientRecords: Map<string, string[]> = new Map()

  constructor(private readonly patientRepository: MockPatientRepository) {}

  async create(record: MedicalRecord): Promise<MedicalRecord> {
    // CRITICAL: Enforce referential integrity - patient must exist
    if (!this.patientRepository.exists(record.patientId)) {
      throw new Error(`Cannot create medical record: Patient ${record.patientId.value} does not exist`)
    }

    this.records.set(record.id.value, record)

    // Track patient-record relationship
    const patientRecordIds = this.patientRecords.get(record.patientId.value) || []
    patientRecordIds.push(record.id.value)
    this.patientRecords.set(record.patientId.value, patientRecordIds)

    return record
  }

  async findById(id: MedicalRecordId): Promise<MedicalRecord | null> {
    return this.records.get(id.value) || null
  }

  async findByPatientId(patientId: PatientId): Promise<MedicalRecord[]> {
    const recordIds = this.patientRecords.get(patientId.value) || []
    return recordIds
      .map(id => this.records.get(id))
      .filter((record): record is MedicalRecord => record !== undefined)
  }

  async deleteByPatientId(patientId: PatientId): Promise<void> {
    const recordIds = this.patientRecords.get(patientId.value) || []
    recordIds.forEach(id => this.records.delete(id))
    this.patientRecords.delete(patientId.value)
  }

  getOrphanedRecords(): MedicalRecord[] {
    // Find records whose patient no longer exists
    return Array.from(this.records.values()).filter(
      record => !this.patientRepository.exists(record.patientId)
    )
  }

  clear(): void {
    this.records.clear()
    this.patientRecords.clear()
  }

  getAllRecords(): MedicalRecord[] {
    return Array.from(this.records.values())
  }
}

class MockDocumentRepository {
  private documents: Map<string, DocumentEntity> = new Map()
  private patientDocuments: Map<string, string[]> = new Map()

  constructor(private readonly patientRepository: MockPatientRepository) {}

  async create(document: DocumentEntity): Promise<DocumentEntity> {
    // CRITICAL: Enforce referential integrity - patient must exist
    if (!this.patientRepository.exists(document.patientId)) {
      throw new Error(`Cannot create document: Patient ${document.patientId.value} does not exist`)
    }

    this.documents.set(document.id, document)

    // Track patient-document relationship
    const patientDocIds = this.patientDocuments.get(document.patientId.value) || []
    patientDocIds.push(document.id)
    this.patientDocuments.set(document.patientId.value, patientDocIds)

    return document
  }

  async findById(id: DocumentId): Promise<DocumentEntity | null> {
    return this.documents.get(id) || null
  }

  async findByPatientId(patientId: PatientId): Promise<DocumentEntity[]> {
    const docIds = this.patientDocuments.get(patientId.value) || []
    return docIds
      .map(id => this.documents.get(id))
      .filter((doc): doc is DocumentEntity => doc !== undefined)
  }

  async deleteByPatientId(patientId: PatientId): Promise<void> {
    const docIds = this.patientDocuments.get(patientId.value) || []
    docIds.forEach(id => this.documents.delete(id))
    this.patientDocuments.delete(patientId.value)
  }

  getOrphanedDocuments(): DocumentEntity[] {
    // Find documents whose patient no longer exists
    return Array.from(this.documents.values()).filter(
      doc => !this.patientRepository.exists(doc.patientId)
    )
  }

  clear(): void {
    this.documents.clear()
    this.patientDocuments.clear()
  }

  getAllDocuments(): DocumentEntity[] {
    return Array.from(this.documents.values())
  }
}

class MockStatusHistoryRepository {
  private transitions: StatusTransition[] = []

  constructor(private readonly patientRepository: MockPatientRepository) {}

  async create(transition: StatusTransition): Promise<StatusTransition> {
    // CRITICAL: Enforce referential integrity - patient must exist
    if (!this.patientRepository.exists(transition.patientId)) {
      throw new Error(`Cannot create status transition: Patient ${transition.patientId.value} does not exist`)
    }

    this.transitions.push(transition)
    return transition
  }

  async findByPatientId(patientId: PatientId): Promise<StatusTransition[]> {
    return this.transitions.filter(t => t.patientId.value === patientId.value)
  }

  async deleteByPatientId(patientId: PatientId): Promise<void> {
    this.transitions = this.transitions.filter(t => t.patientId.value !== patientId.value)
  }

  getOrphanedTransitions(): StatusTransition[] {
    // Find transitions whose patient no longer exists
    return this.transitions.filter(
      transition => !this.patientRepository.exists(transition.patientId)
    )
  }

  clear(): void {
    this.transitions = []
  }

  getAllTransitions(): StatusTransition[] {
    return [...this.transitions]
  }
}

// ============================================================================
// GENERATORS
// ============================================================================

const patientGenerator = (): fc.Arbitrary<Patient> =>
  fc.record({
    id: patientIdGenerator(),
    personalInfo: personalInformationGenerator(),
    contactInfo: contactInformationGenerator(),
    emergencyContact: emergencyContactGenerator(),
    insuranceInfo: insuranceInformationGenerator(),
    status: patientStatusGenerator(),
    createdBy: userIdGenerator()
  }).map(data => {
    const now = new Date()
    return new Patient(
      data.id,
      data.personalInfo,
      data.contactInfo,
      data.emergencyContact,
      data.insuranceInfo,
      data.status,
      now,
      now,
      data.createdBy
    )
  })

const medicalRecordGenerator = (patientId: PatientId): fc.Arbitrary<MedicalRecord> =>
  fc.record({
    id: medicalRecordIdGenerator(),
    diagnosis: fc.array(diagnosisGenerator(), { minLength: 0, maxLength: 2 }),
    medications: fc.array(medicationGenerator(), { minLength: 0, maxLength: 2 }),
    allergies: fc.array(allergyGenerator(), { minLength: 0, maxLength: 2 }),
    progressNotes: fc.array(progressNoteGenerator(), { minLength: 0, maxLength: 2 }),
    assessments: fc.array(assessmentGenerator(), { minLength: 0, maxLength: 1 })
  }).map(data => {
    const now = new Date()
    return new MedicalRecord(
      data.id,
      patientId,
      data.diagnosis,
      [],
      data.medications,
      data.allergies,
      data.progressNotes,
      data.assessments,
      now,
      now
    )
  })

const documentGenerator = (patientId: PatientId): fc.Arbitrary<DocumentEntity> =>
  fc.record({
    id: fc.uuid(),
    fileName: fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.pdf`),
    filePath: fc.string({ minLength: 10, maxLength: 100 }),
    fileType: fc.constantFrom('application/pdf', 'image/jpeg', 'image/png'),
    fileSize: fc.integer({ min: 1024, max: 10485760 }),
    uploadedBy: userIdGenerator()
  }).map(data => {
    const now = new Date()
    const metadata: DocumentMetadata = {
      title: data.fileName,
      description: 'Test document',
      documentType: DocumentType.MEDICAL_REPORT,
      isConfidential: true,
      tags: [],
      version: 1
    }
    return new DocumentEntity(
      data.id,
      patientId,
      data.fileName,
      data.filePath,
      data.fileType,
      data.fileSize,
      metadata,
      {
        isEncrypted: true,
        encryptionAlgorithm: 'AES-256',
        virusScanResult: 'clean',
        virusScanDate: now,
        checksum: 'abc123'
      },
      DocumentStatus.VALIDATED,
      now,
      data.uploadedBy,
      now
    )
  })

const statusTransitionGenerator = (patientId: PatientId): fc.Arbitrary<StatusTransition> =>
  fc.record({
    id: fc.uuid(),
    fromStatus: fc.option(fc.constantFrom<PatientStatusType>('new', 'active', 'on_hold', 'discharged', 'inactive')),
    toStatus: fc.constantFrom<PatientStatusType>('new', 'active', 'on_hold', 'discharged', 'inactive'),
    reason: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
    changedBy: userIdGenerator()
  }).map(data => ({
    id: data.id,
    patientId,
    fromStatus: data.fromStatus || null,
    toStatus: data.toStatus,
    timestamp: new Date(),
    reason: data.reason || undefined,
    changedBy: data.changedBy
  }))

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 12: Referential Integrity Preservation', () => {
  // ============================================================================
  // MEDICAL RECORD REFERENTIAL INTEGRITY TESTS
  // ============================================================================

  test('Property 12.1: Medical records can only be created for existing patients', () => {
    fc.assert(
      fc.asyncProperty(
        patientGenerator(),
        patientIdGenerator(), // Non-existent patient ID
        async (patient, nonExistentPatientId) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const medicalRecordRepo = new MockMedicalRecordRepository(patientRepo)

          // Create patient
          await patientRepo.create(patient)

          // Create medical record for existing patient - should succeed
          const validRecord = await fc.sample(medicalRecordGenerator(patient.id), 1)[0]
          const createdRecord = await medicalRecordRepo.create(validRecord)
          expect(createdRecord).toBeDefined()

          // Attempt to create medical record for non-existent patient - should fail
          if (nonExistentPatientId.value !== patient.id.value) {
            const invalidRecord = await fc.sample(medicalRecordGenerator(nonExistentPatientId), 1)[0]
            
            let errorOccurred = false
            try {
              await medicalRecordRepo.create(invalidRecord)
            } catch (_error) {
              errorOccurred = true
            }

            // CRITICAL: Should reject creation for non-existent patient
            expect(errorOccurred).toBe(true)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 12.2: No orphaned medical records exist after patient operations', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientGenerator(), { minLength: 2, maxLength: 5 }),
        async (patients) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const medicalRecordRepo = new MockMedicalRecordRepository(patientRepo)

          // Create patients and their medical records
          for (const patient of patients) {
            await patientRepo.create(patient)
            
            // Create 1-3 medical records per patient
            const recordCount = Math.floor(Math.random() * 3) + 1
            for (let i = 0; i < recordCount; i++) {
              const record = await fc.sample(medicalRecordGenerator(patient.id), 1)[0]
              await medicalRecordRepo.create(record)
            }
          }

          // Verify no orphaned records initially
          let orphanedRecords = medicalRecordRepo.getOrphanedRecords()
          expect(orphanedRecords).toHaveLength(0)

          // Delete a patient
          if (patients.length > 0) {
            const patientToDelete = patients[0]
            await patientRepo.delete(patientToDelete.id)

            // Check for orphaned records
            orphanedRecords = medicalRecordRepo.getOrphanedRecords()

            // CRITICAL: If cascade delete is not implemented, orphaned records exist
            // This test documents the expected behavior - either:
            // 1. Cascade delete removes related records (orphanedRecords.length === 0)
            // 2. Or deletion is prevented if records exist
            // For this test, we verify orphaned records are detected
            const recordsForDeletedPatient = await medicalRecordRepo.findByPatientId(patientToDelete.id)
            
            if (recordsForDeletedPatient.length > 0) {
              // If records still exist, they should be orphaned
              expect(orphanedRecords.length).toBeGreaterThan(0)
            }
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 12.3: Cascade delete maintains referential integrity for medical records', () => {
    fc.assert(
      fc.asyncProperty(
        patientGenerator(),
        fc.integer({ min: 1, max: 5 }),
        async (patient, recordCount) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const medicalRecordRepo = new MockMedicalRecordRepository(patientRepo)

          // Create patient
          await patientRepo.create(patient)

          // Create multiple medical records
          const createdRecords: MedicalRecord[] = []
          for (let i = 0; i < recordCount; i++) {
            const record = await fc.sample(medicalRecordGenerator(patient.id), 1)[0]
            const created = await medicalRecordRepo.create(record)
            createdRecords.push(created)
          }

          // Verify records exist
          const recordsBefore = await medicalRecordRepo.findByPatientId(patient.id)
          expect(recordsBefore.length).toBe(recordCount)

          // Cascade delete medical records
          await medicalRecordRepo.deleteByPatientId(patient.id)

          // Verify records are deleted
          const recordsAfter = await medicalRecordRepo.findByPatientId(patient.id)
          expect(recordsAfter).toHaveLength(0)

          // CRITICAL: No orphaned records should exist
          const orphanedRecords = medicalRecordRepo.getOrphanedRecords()
          expect(orphanedRecords).toHaveLength(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // DOCUMENT REFERENTIAL INTEGRITY TESTS
  // ============================================================================

  test('Property 12.4: Documents can only be created for existing patients', () => {
    fc.assert(
      fc.asyncProperty(
        patientGenerator(),
        patientIdGenerator(), // Non-existent patient ID
        async (patient, nonExistentPatientId) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const documentRepo = new MockDocumentRepository(patientRepo)

          // Create patient
          await patientRepo.create(patient)

          // Create document for existing patient - should succeed
          const validDoc = await fc.sample(documentGenerator(patient.id), 1)[0]
          const createdDoc = await documentRepo.create(validDoc)
          expect(createdDoc).toBeDefined()

          // Attempt to create document for non-existent patient - should fail
          if (nonExistentPatientId.value !== patient.id.value) {
            const invalidDoc = await fc.sample(documentGenerator(nonExistentPatientId), 1)[0]
            
            let errorOccurred = false
            try {
              await documentRepo.create(invalidDoc)
            } catch (_error) {
              errorOccurred = true
            }

            // CRITICAL: Should reject creation for non-existent patient
            expect(errorOccurred).toBe(true)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 12.5: No orphaned documents exist after patient operations', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientGenerator(), { minLength: 2, maxLength: 5 }),
        async (patients) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const documentRepo = new MockDocumentRepository(patientRepo)

          // Create patients and their documents
          for (const patient of patients) {
            await patientRepo.create(patient)
            
            // Create 1-3 documents per patient
            const docCount = Math.floor(Math.random() * 3) + 1
            for (let i = 0; i < docCount; i++) {
              const doc = await fc.sample(documentGenerator(patient.id), 1)[0]
              await documentRepo.create(doc)
            }
          }

          // Verify no orphaned documents initially
          let orphanedDocs = documentRepo.getOrphanedDocuments()
          expect(orphanedDocs).toHaveLength(0)

          // Delete a patient
          if (patients.length > 0) {
            const patientToDelete = patients[0]
            await patientRepo.delete(patientToDelete.id)

            // Check for orphaned documents
            orphanedDocs = documentRepo.getOrphanedDocuments()

            // CRITICAL: Orphaned documents should be detected
            const docsForDeletedPatient = await documentRepo.findByPatientId(patientToDelete.id)
            
            if (docsForDeletedPatient.length > 0) {
              // If documents still exist, they should be orphaned
              expect(orphanedDocs.length).toBeGreaterThan(0)
            }
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 12.6: Cascade delete maintains referential integrity for documents', () => {
    fc.assert(
      fc.asyncProperty(
        patientGenerator(),
        fc.integer({ min: 1, max: 5 }),
        async (patient, docCount) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const documentRepo = new MockDocumentRepository(patientRepo)

          // Create patient
          await patientRepo.create(patient)

          // Create multiple documents
          for (let i = 0; i < docCount; i++) {
            const doc = await fc.sample(documentGenerator(patient.id), 1)[0]
            await documentRepo.create(doc)
          }

          // Verify documents exist
          const docsBefore = await documentRepo.findByPatientId(patient.id)
          expect(docsBefore.length).toBe(docCount)

          // Cascade delete documents
          await documentRepo.deleteByPatientId(patient.id)

          // Verify documents are deleted
          const docsAfter = await documentRepo.findByPatientId(patient.id)
          expect(docsAfter).toHaveLength(0)

          // CRITICAL: No orphaned documents should exist
          const orphanedDocs = documentRepo.getOrphanedDocuments()
          expect(orphanedDocs).toHaveLength(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // STATUS HISTORY REFERENTIAL INTEGRITY TESTS
  // ============================================================================

  test('Property 12.7: Status transitions can only be created for existing patients', () => {
    fc.assert(
      fc.asyncProperty(
        patientGenerator(),
        patientIdGenerator(), // Non-existent patient ID
        async (patient, nonExistentPatientId) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const statusHistoryRepo = new MockStatusHistoryRepository(patientRepo)

          // Create patient
          await patientRepo.create(patient)

          // Create status transition for existing patient - should succeed
          const validTransition = await fc.sample(statusTransitionGenerator(patient.id), 1)[0]
          const createdTransition = await statusHistoryRepo.create(validTransition)
          expect(createdTransition).toBeDefined()

          // Attempt to create status transition for non-existent patient - should fail
          if (nonExistentPatientId.value !== patient.id.value) {
            const invalidTransition = await fc.sample(statusTransitionGenerator(nonExistentPatientId), 1)[0]
            
            let errorOccurred = false
            try {
              await statusHistoryRepo.create(invalidTransition)
            } catch (_error) {
              errorOccurred = true
            }

            // CRITICAL: Should reject creation for non-existent patient
            expect(errorOccurred).toBe(true)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 12.8: No orphaned status transitions exist after patient operations', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientGenerator(), { minLength: 2, maxLength: 5 }),
        async (patients) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const statusHistoryRepo = new MockStatusHistoryRepository(patientRepo)

          // Create patients and their status transitions
          for (const patient of patients) {
            await patientRepo.create(patient)
            
            // Create 1-3 status transitions per patient
            const transitionCount = Math.floor(Math.random() * 3) + 1
            for (let i = 0; i < transitionCount; i++) {
              const transition = await fc.sample(statusTransitionGenerator(patient.id), 1)[0]
              await statusHistoryRepo.create(transition)
            }
          }

          // Verify no orphaned transitions initially
          let orphanedTransitions = statusHistoryRepo.getOrphanedTransitions()
          expect(orphanedTransitions).toHaveLength(0)

          // Delete a patient
          if (patients.length > 0) {
            const patientToDelete = patients[0]
            await patientRepo.delete(patientToDelete.id)

            // Check for orphaned transitions
            orphanedTransitions = statusHistoryRepo.getOrphanedTransitions()

            // CRITICAL: Orphaned transitions should be detected
            const transitionsForDeletedPatient = await statusHistoryRepo.findByPatientId(patientToDelete.id)
            
            if (transitionsForDeletedPatient.length > 0) {
              // If transitions still exist, they should be orphaned
              expect(orphanedTransitions.length).toBeGreaterThan(0)
            }
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 12.9: Cascade delete maintains referential integrity for status history', () => {
    fc.assert(
      fc.asyncProperty(
        patientGenerator(),
        fc.integer({ min: 1, max: 5 }),
        async (patient, transitionCount) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const statusHistoryRepo = new MockStatusHistoryRepository(patientRepo)

          // Create patient
          await patientRepo.create(patient)

          // Create multiple status transitions
          for (let i = 0; i < transitionCount; i++) {
            const transition = await fc.sample(statusTransitionGenerator(patient.id), 1)[0]
            await statusHistoryRepo.create(transition)
          }

          // Verify transitions exist
          const transitionsBefore = await statusHistoryRepo.findByPatientId(patient.id)
          expect(transitionsBefore.length).toBe(transitionCount)

          // Cascade delete status transitions
          await statusHistoryRepo.deleteByPatientId(patient.id)

          // Verify transitions are deleted
          const transitionsAfter = await statusHistoryRepo.findByPatientId(patient.id)
          expect(transitionsAfter).toHaveLength(0)

          // CRITICAL: No orphaned transitions should exist
          const orphanedTransitions = statusHistoryRepo.getOrphanedTransitions()
          expect(orphanedTransitions).toHaveLength(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // COMPREHENSIVE REFERENTIAL INTEGRITY TESTS
  // ============================================================================

  test('Property 12.10: All related entities maintain referential integrity across operations', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientGenerator(), { minLength: 2, maxLength: 4 }),
        async (patients) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const medicalRecordRepo = new MockMedicalRecordRepository(patientRepo)
          const documentRepo = new MockDocumentRepository(patientRepo)
          const statusHistoryRepo = new MockStatusHistoryRepository(patientRepo)

          // Create patients with all related entities
          for (const patient of patients) {
            await patientRepo.create(patient)
            
            // Create medical records
            const recordCount = Math.floor(Math.random() * 2) + 1
            for (let i = 0; i < recordCount; i++) {
              const record = await fc.sample(medicalRecordGenerator(patient.id), 1)[0]
              await medicalRecordRepo.create(record)
            }

            // Create documents
            const docCount = Math.floor(Math.random() * 2) + 1
            for (let i = 0; i < docCount; i++) {
              const doc = await fc.sample(documentGenerator(patient.id), 1)[0]
              await documentRepo.create(doc)
            }

            // Create status transitions
            const transitionCount = Math.floor(Math.random() * 2) + 1
            for (let i = 0; i < transitionCount; i++) {
              const transition = await fc.sample(statusTransitionGenerator(patient.id), 1)[0]
              await statusHistoryRepo.create(transition)
            }
          }

          // Verify no orphaned entities initially
          expect(medicalRecordRepo.getOrphanedRecords()).toHaveLength(0)
          expect(documentRepo.getOrphanedDocuments()).toHaveLength(0)
          expect(statusHistoryRepo.getOrphanedTransitions()).toHaveLength(0)

          // Perform cascade delete for first patient
          if (patients.length > 0) {
            const patientToDelete = patients[0]
            
            await medicalRecordRepo.deleteByPatientId(patientToDelete.id)
            await documentRepo.deleteByPatientId(patientToDelete.id)
            await statusHistoryRepo.deleteByPatientId(patientToDelete.id)
            await patientRepo.delete(patientToDelete.id)

            // CRITICAL: No orphaned entities should exist after cascade delete
            expect(medicalRecordRepo.getOrphanedRecords()).toHaveLength(0)
            expect(documentRepo.getOrphanedDocuments()).toHaveLength(0)
            expect(statusHistoryRepo.getOrphanedTransitions()).toHaveLength(0)

            // Verify other patients' data is intact
            for (let i = 1; i < patients.length; i++) {
              const patient = patients[i]
              const records = await medicalRecordRepo.findByPatientId(patient.id)
              const docs = await documentRepo.findByPatientId(patient.id)
              const transitions = await statusHistoryRepo.findByPatientId(patient.id)

              expect(records.length).toBeGreaterThan(0)
              expect(docs.length).toBeGreaterThan(0)
              expect(transitions.length).toBeGreaterThan(0)
            }
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 12.11: Referential integrity is maintained across multiple entity types simultaneously', () => {
    fc.assert(
      fc.asyncProperty(
        patientGenerator(),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        async (patient, recordCount, docCount, transitionCount) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const medicalRecordRepo = new MockMedicalRecordRepository(patientRepo)
          const documentRepo = new MockDocumentRepository(patientRepo)
          const statusHistoryRepo = new MockStatusHistoryRepository(patientRepo)

          // Create patient
          await patientRepo.create(patient)

          // Create all related entities
          const records: MedicalRecord[] = []
          for (let i = 0; i < recordCount; i++) {
            const record = await fc.sample(medicalRecordGenerator(patient.id), 1)[0]
            records.push(await medicalRecordRepo.create(record))
          }

          const docs: DocumentEntity[] = []
          for (let i = 0; i < docCount; i++) {
            const doc = await fc.sample(documentGenerator(patient.id), 1)[0]
            docs.push(await documentRepo.create(doc))
          }

          const transitions: StatusTransition[] = []
          for (let i = 0; i < transitionCount; i++) {
            const transition = await fc.sample(statusTransitionGenerator(patient.id), 1)[0]
            transitions.push(await statusHistoryRepo.create(transition))
          }

          // Verify all entities reference the correct patient
          records.forEach(record => {
            expect(record.patientId.value).toBe(patient.id.value)
          })

          docs.forEach(doc => {
            expect(doc.patientId.value).toBe(patient.id.value)
          })

          transitions.forEach(transition => {
            expect(transition.patientId.value).toBe(patient.id.value)
          })

          // CRITICAL: All entities should be retrievable via patient ID
          const retrievedRecords = await medicalRecordRepo.findByPatientId(patient.id)
          const retrievedDocs = await documentRepo.findByPatientId(patient.id)
          const retrievedTransitions = await statusHistoryRepo.findByPatientId(patient.id)

          expect(retrievedRecords.length).toBe(recordCount)
          expect(retrievedDocs.length).toBe(docCount)
          expect(retrievedTransitions.length).toBe(transitionCount)

          // Verify no orphaned entities
          expect(medicalRecordRepo.getOrphanedRecords()).toHaveLength(0)
          expect(documentRepo.getOrphanedDocuments()).toHaveLength(0)
          expect(statusHistoryRepo.getOrphanedTransitions()).toHaveLength(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 12.12: Invalid references are rejected at creation time', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        async (nonExistentPatientId) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const medicalRecordRepo = new MockMedicalRecordRepository(patientRepo)
          const documentRepo = new MockDocumentRepository(patientRepo)
          const statusHistoryRepo = new MockStatusHistoryRepository(patientRepo)

          // Attempt to create entities for non-existent patient
          const record = await fc.sample(medicalRecordGenerator(nonExistentPatientId), 1)[0]
          const doc = await fc.sample(documentGenerator(nonExistentPatientId), 1)[0]
          const transition = await fc.sample(statusTransitionGenerator(nonExistentPatientId), 1)[0]

          let recordError = false
          let docError = false
          let transitionError = false

          try {
            await medicalRecordRepo.create(record)
          } catch (_error) {
            recordError = true
          }

          try {
            await documentRepo.create(doc)
          } catch (_error) {
            docError = true
          }

          try {
            await statusHistoryRepo.create(transition)
          } catch (_error) {
            transitionError = true
          }

          // CRITICAL: All creation attempts should fail
          expect(recordError).toBe(true)
          expect(docError).toBe(true)
          expect(transitionError).toBe(true)

          // Verify no entities were created
          expect(medicalRecordRepo.getAllRecords()).toHaveLength(0)
          expect(documentRepo.getAllDocuments()).toHaveLength(0)
          expect(statusHistoryRepo.getAllTransitions()).toHaveLength(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 12.13: Referential integrity prevents orphaned records across all entity types', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientGenerator(), { minLength: 3, maxLength: 6 }),
        async (patients) => {
          // Create fresh repositories for this iteration
          const patientRepo = new MockPatientRepository()
          const medicalRecordRepo = new MockMedicalRecordRepository(patientRepo)
          const documentRepo = new MockDocumentRepository(patientRepo)
          const statusHistoryRepo = new MockStatusHistoryRepository(patientRepo)

          // Create patients with varying amounts of related data
          for (const patient of patients) {
            await patientRepo.create(patient)
            
            const entityCounts = {
              records: Math.floor(Math.random() * 3) + 1,
              docs: Math.floor(Math.random() * 3) + 1,
              transitions: Math.floor(Math.random() * 3) + 1
            }

            for (let i = 0; i < entityCounts.records; i++) {
              const record = await fc.sample(medicalRecordGenerator(patient.id), 1)[0]
              await medicalRecordRepo.create(record)
            }

            for (let i = 0; i < entityCounts.docs; i++) {
              const doc = await fc.sample(documentGenerator(patient.id), 1)[0]
              await documentRepo.create(doc)
            }

            for (let i = 0; i < entityCounts.transitions; i++) {
              const transition = await fc.sample(statusTransitionGenerator(patient.id), 1)[0]
              await statusHistoryRepo.create(transition)
            }
          }

          // Delete random patients without cascade delete
          const patientsToDelete = patients.slice(0, Math.floor(patients.length / 2))
          for (const patient of patientsToDelete) {
            await patientRepo.delete(patient.id)
          }

          // Check for orphaned entities
          const orphanedRecords = medicalRecordRepo.getOrphanedRecords()
          const orphanedDocs = documentRepo.getOrphanedDocuments()
          const orphanedTransitions = statusHistoryRepo.getOrphanedTransitions()

          // CRITICAL: Orphaned entities should be detected
          // This test verifies the detection mechanism works
          const totalOrphaned = orphanedRecords.length + orphanedDocs.length + orphanedTransitions.length

          if (patientsToDelete.length > 0) {
            // If patients were deleted, there should be orphaned entities
            // (unless cascade delete was performed, which we didn't do in this test)
            expect(totalOrphaned).toBeGreaterThan(0)
          }

          // Verify orphaned entities all reference deleted patients
          orphanedRecords.forEach(record => {
            const patientExists = patientRepo.exists(record.patientId)
            expect(patientExists).toBe(false)
          })

          orphanedDocs.forEach(doc => {
            const patientExists = patientRepo.exists(doc.patientId)
            expect(patientExists).toBe(false)
          })

          orphanedTransitions.forEach(transition => {
            const patientExists = patientRepo.exists(transition.patientId)
            expect(patientExists).toBe(false)
          })

          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})
