// ============================================================================
// STATUS TRACKER SERVICE TESTS
// Unit tests for the StatusTracker service
// ============================================================================

import { StatusTracker, StatusTransitionRequest } from '../../../application/services/StatusTracker'
import { PatientStatus, PatientStatusValues, PatientStatusType } from '../../../domain/value-objects/PatientStatus'
import { Patient } from '../../../domain/entities/Patient'
import { PersonalInformation } from '../../../domain/value-objects/PersonalInformation'
import { ContactInformation } from '../../../domain/value-objects/ContactInformation'
import { FullName } from '../../../domain/value-objects/FullName'
import { CPF } from '../../../domain/value-objects/CPF'
import { PhoneNumber } from '../../../domain/value-objects/PhoneNumber'
import { Address } from '../../../domain/value-objects/Address'
import { Gender } from '../../../domain/value-objects/Gender'
import { RG } from '../../../domain/value-objects/RG'

// Mock repositories
const mockPatientRepository = {
  findById: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  search: jest.fn()
}

const mockStatusHistoryRepository = {
  create: jest.fn(),
  search: jest.fn(),
  getStatistics: jest.fn(),
  getAverageTimeInStatus: jest.fn()
}

describe('StatusTracker', () => {
  let statusTracker: StatusTracker
  const mockPatientId = 'patient-123'
  const mockUserId = 'user-456'

  beforeEach(() => {
    jest.clearAllMocks()
    statusTracker = new StatusTracker(
      mockPatientRepository as any,
      mockStatusHistoryRepository as any
    )
  })

  describe('changePatientStatus', () => {
    it('should successfully change patient status from NEW to ACTIVE', async () => {
      // Mock patient with NEW status
      const mockPatient = createMockPatient(PatientStatusValues.NEW)
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockPatientRepository.update.mockResolvedValue({
        ...mockPatient,
        status: new PatientStatus(PatientStatusValues.ACTIVE)
      })
      mockStatusHistoryRepository.create.mockResolvedValue({
        id: 'transition-123',
        patientId: mockPatientId,
        fromStatus: PatientStatusValues.NEW,
        toStatus: PatientStatusValues.ACTIVE,
        timestamp: new Date(),
        changedBy: mockUserId
      })

      const request: StatusTransitionRequest = {
        patientId: mockPatientId,
        newStatus: PatientStatusValues.ACTIVE,
        userId: mockUserId
      }

      const result = await statusTracker.changePatientStatus(request)

      expect(result.fromStatus).toBe(PatientStatusValues.NEW)
      expect(result.toStatus).toBe(PatientStatusValues.ACTIVE)
      expect(result.patientId).toBe(mockPatientId)
      expect(result.changedBy).toBe(mockUserId)
      expect(mockPatientRepository.update).toHaveBeenCalledWith(mockPatientId, {
        status: new PatientStatus(PatientStatusValues.ACTIVE)
      })
      expect(mockStatusHistoryRepository.create).toHaveBeenCalled()
    })

    it('should require reason for ACTIVE to DISCHARGED transition', async () => {
      const mockPatient = createMockPatient(PatientStatusValues.ACTIVE)
      mockPatientRepository.findById.mockResolvedValue(mockPatient)

      const request: StatusTransitionRequest = {
        patientId: mockPatientId,
        newStatus: PatientStatusValues.DISCHARGED,
        userId: mockUserId
        // No reason provided
      }

      await expect(statusTracker.changePatientStatus(request))
        .rejects.toThrow('requires a reason')
    })

    it('should allow ACTIVE to DISCHARGED transition with reason', async () => {
      const mockPatient = createMockPatient(PatientStatusValues.ACTIVE)
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockPatientRepository.update.mockResolvedValue({
        ...mockPatient,
        status: new PatientStatus(PatientStatusValues.DISCHARGED)
      })
      mockStatusHistoryRepository.create.mockResolvedValue({
        id: 'transition-123',
        patientId: mockPatientId,
        fromStatus: PatientStatusValues.ACTIVE,
        toStatus: PatientStatusValues.DISCHARGED,
        reason: 'Treatment completed successfully',
        timestamp: new Date(),
        changedBy: mockUserId
      })

      const request: StatusTransitionRequest = {
        patientId: mockPatientId,
        newStatus: PatientStatusValues.DISCHARGED,
        reason: 'Treatment completed successfully',
        userId: mockUserId
      }

      const result = await statusTracker.changePatientStatus(request)

      expect(result.fromStatus).toBe(PatientStatusValues.ACTIVE)
      expect(result.toStatus).toBe(PatientStatusValues.DISCHARGED)
      expect(result.reason).toBe('Treatment completed successfully')
    })

    it('should reject invalid status transitions', async () => {
      const mockPatient = createMockPatient(PatientStatusValues.DISCHARGED)
      mockPatientRepository.findById.mockResolvedValue(mockPatient)

      const request: StatusTransitionRequest = {
        patientId: mockPatientId,
        newStatus: PatientStatusValues.NEW, // Invalid transition
        userId: mockUserId
      }

      await expect(statusTracker.changePatientStatus(request))
        .rejects.toThrow('not defined')
    })

    it('should throw error when patient not found', async () => {
      mockPatientRepository.findById.mockResolvedValue(null)

      const request: StatusTransitionRequest = {
        patientId: mockPatientId,
        newStatus: PatientStatusValues.ACTIVE,
        userId: mockUserId
      }

      await expect(statusTracker.changePatientStatus(request))
        .rejects.toThrow('Patient not found')
    })
  })

  describe('getPatientStatusHistory', () => {
    it('should retrieve patient status history', async () => {
      const mockTransitions = [
        {
          id: 'transition-1',
          patientId: mockPatientId,
          fromStatus: null,
          toStatus: PatientStatusValues.NEW,
          timestamp: new Date('2024-01-01'),
          changedBy: mockUserId
        },
        {
          id: 'transition-2',
          patientId: mockPatientId,
          fromStatus: PatientStatusValues.NEW,
          toStatus: PatientStatusValues.ACTIVE,
          timestamp: new Date('2024-01-02'),
          changedBy: mockUserId
        }
      ]

      mockStatusHistoryRepository.search.mockResolvedValue({
        data: mockTransitions,
        total: 2
      })

      const result = await statusTracker.getPatientStatusHistory(mockPatientId)

      expect(result).toHaveLength(2)
      expect(result[0].toStatus).toBe(PatientStatusValues.NEW)
      expect(result[1].toStatus).toBe(PatientStatusValues.ACTIVE)
      expect(mockStatusHistoryRepository.search).toHaveBeenCalledWith(
        { patientId: mockPatientId },
        expect.objectContaining({ limit: 50 })
      )
    })
  })

  describe('getPatientsByStatus', () => {
    it('should retrieve patients by status', async () => {
      const mockPatients = [
        createMockPatient(PatientStatusValues.ACTIVE),
        createMockPatient(PatientStatusValues.ACTIVE)
      ]

      mockPatientRepository.search.mockResolvedValue({
        data: mockPatients,
        total: 2
      })

      const result = await statusTracker.getPatientsByStatus(PatientStatusValues.ACTIVE)

      expect(result).toHaveLength(2)
      expect(mockPatientRepository.search).toHaveBeenCalledWith(
        { status: new PatientStatus(PatientStatusValues.ACTIVE) },
        expect.objectContaining({ limit: 100 })
      )
    })

    it('should apply additional filtering criteria', async () => {
      const changedAfter = new Date('2024-01-01')
      mockPatientRepository.search.mockResolvedValue({
        data: [],
        total: 0
      })

      await statusTracker.getPatientsByStatus(PatientStatusValues.ACTIVE, {
        changedAfter
      })

      expect(mockPatientRepository.search).toHaveBeenCalledWith(
        {
          status: new PatientStatus(PatientStatusValues.ACTIVE)
        },
        expect.any(Object)
      )
    })
  })

  describe('getStatusStatistics', () => {
    it('should return comprehensive status statistics', async () => {
      mockPatientRepository.count.mockResolvedValue(100)
      mockStatusHistoryRepository.getStatistics.mockResolvedValue({
        statusCounts: {
          'new': 10,
          'active': 60,
          'on_hold': 5,
          'discharged': 20,
          'inactive': 5
        },
        transitionsToday: 5,
        transitionsThisWeek: 25,
        transitionsThisMonth: 100,
        mostCommonTransitions: []
      })
      mockStatusHistoryRepository.search.mockResolvedValue({
        data: []
      })
      mockStatusHistoryRepository.getAverageTimeInStatus.mockResolvedValue({
        'new': 7,
        'active': 90,
        'on_hold': 30,
        'discharged': 0,
        'inactive': 0
      })

      const result = await statusTracker.getStatusStatistics()

      expect(result.totalPatients).toBe(100)
      expect(result.statusCounts[PatientStatusValues.ACTIVE]).toBe(60)
      expect(result.averageTimeInStatus[PatientStatusValues.ACTIVE]).toBe(90)
    })
  })

  describe('validateStatusTransition', () => {
    it('should validate allowed transitions', async () => {
      await expect(
        statusTracker.validateStatusTransition(PatientStatusValues.NEW, PatientStatusValues.ACTIVE)
      ).resolves.not.toThrow()
    })

    it('should reject disallowed transitions', async () => {
      await expect(
        statusTracker.validateStatusTransition(PatientStatusValues.INACTIVE, PatientStatusValues.NEW)
      ).rejects.toThrow('not allowed')
    })

    it('should require reason for transitions that need it', async () => {
      await expect(
        statusTracker.validateStatusTransition(PatientStatusValues.ACTIVE, PatientStatusValues.DISCHARGED)
      ).rejects.toThrow('requires a reason')

      await expect(
        statusTracker.validateStatusTransition(
          PatientStatusValues.ACTIVE,
          PatientStatusValues.DISCHARGED,
          'Treatment completed'
        )
      ).resolves.not.toThrow()
    })
  })

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions for NEW status', () => {
      const allowed = statusTracker.getAllowedTransitions(PatientStatusValues.NEW)
      
      expect(allowed).toContain(PatientStatusValues.ACTIVE)
      expect(allowed).toContain(PatientStatusValues.INACTIVE)
      expect(allowed).not.toContain(PatientStatusValues.DISCHARGED)
    })

    it('should return allowed transitions for ACTIVE status', () => {
      const allowed = statusTracker.getAllowedTransitions(PatientStatusValues.ACTIVE)
      
      expect(allowed).toContain(PatientStatusValues.ON_HOLD)
      expect(allowed).toContain(PatientStatusValues.DISCHARGED)
      expect(allowed).toContain(PatientStatusValues.INACTIVE)
      expect(allowed).not.toContain(PatientStatusValues.NEW)
    })

    it('should return allowed transitions for null (new patient)', () => {
      const allowed = statusTracker.getAllowedTransitions(null)
      
      expect(allowed).toContain(PatientStatusValues.NEW)
      expect(allowed).toHaveLength(1)
    })
  })

  describe('requiresReason', () => {
    it('should return true for transitions that require reason', () => {
      expect(statusTracker.requiresReason(PatientStatusValues.ACTIVE, PatientStatusValues.DISCHARGED))
        .toBe(true)
      expect(statusTracker.requiresReason(PatientStatusValues.ACTIVE, PatientStatusValues.ON_HOLD))
        .toBe(true)
    })

    it('should return false for transitions that do not require reason', () => {
      expect(statusTracker.requiresReason(PatientStatusValues.NEW, PatientStatusValues.ACTIVE))
        .toBe(false)
      expect(statusTracker.requiresReason(PatientStatusValues.ON_HOLD, PatientStatusValues.ACTIVE))
        .toBe(false)
    })
  })

  // Helper function to create mock patient
  function createMockPatient(status: PatientStatusType): Patient {
    const personalInfo = new PersonalInformation(
      new FullName('João Silva'), // Fixed: provide full name as single string
      new Date('1990-01-01'),
      Gender.MALE,
      new CPF('11144477735'), // Valid CPF
      new RG('123456789')
    )

    const contactInfo = new ContactInformation(
      new PhoneNumber('11987654321'),
      undefined,
      undefined,
      new Address('Rua A', '123', null, 'Centro', 'São Paulo', 'SP', '01000000')
    )

    return new Patient(
      mockPatientId,
      personalInfo,
      contactInfo,
      undefined,
      undefined,
      new PatientStatus(status),
      new Date(),
      new Date(),
      mockUserId
    )
  }
})