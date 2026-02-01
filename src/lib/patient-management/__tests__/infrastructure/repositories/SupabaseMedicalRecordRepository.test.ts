// ============================================================================
// SUPABASE MEDICAL RECORD REPOSITORY TESTS
// Unit tests for SupabaseMedicalRecordRepository
// ============================================================================

import { SupabaseMedicalRecordRepository } from '../../../infrastructure/repositories/SupabaseMedicalRecordRepository'
import { MedicalRecordId } from '../../../domain/value-objects/MedicalRecordId'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { ProgressNote } from '../../../domain/value-objects/ProgressNote'
import { Assessment } from '../../../domain/value-objects/Assessment'
import { UserId } from '../../../domain/value-objects/UserId'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        is: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      in: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      })),
      order: jest.fn().mockResolvedValue({ data: [], error: null })
    })),
    update: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null })
    }))
  }))
}

describe('SupabaseMedicalRecordRepository', () => {
  let repository: SupabaseMedicalRecordRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repository = new SupabaseMedicalRecordRepository(mockSupabaseClient as any)
  })

  describe('create', () => {
    it('should create a medical record with basic data', async () => {
      const patientId = new PatientId('550e8400-e29b-41d4-a716-446655440000')
      const request = {
        patientId,
        diagnosis: [{
          code: 'F80.1',
          description: 'Expressive language disorder',
          diagnosedAt: new Date('2024-01-15'),
          severity: 'moderate' as const
        }]
      }

      const mockRecordData = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        diagnosis: [{
          code: 'F80.1',
          description: 'Expressive language disorder',
          diagnosedAt: '2024-01-15T00:00:00.000Z',
          severity: 'moderate'
        }],
        treatment_history: [],
        medications: [],
        allergies: [],
        created_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({ 
        data: mockRecordData, 
        error: null 
      })

      const result = await repository.create(request)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('medical_records')
      expect(result.patientId.value).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.diagnosis).toHaveLength(1)
      expect(result.diagnosis[0].code).toBe('F80.1')
    })

    it('should throw error when database insert fails', async () => {
      const patientId = new PatientId('550e8400-e29b-41d4-a716-446655440000')
      const request = { patientId }

      // Create a new mock for this specific test
      const mockInsert = jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Database error' } 
          })
        }))
      }))
      
      const mockFrom = jest.fn(() => ({
        insert: mockInsert
      }))
      
      mockSupabaseClient.from = mockFrom

      await expect(repository.create(request)).rejects.toThrow('Failed to create medical record: Database error')
    })
  })

  describe('addProgressNote', () => {
    it('should add a progress note to a medical record', async () => {
      const recordId = new MedicalRecordId('550e8400-e29b-41d4-a716-446655440001')
      const userId = new UserId('550e8400-e29b-41d4-a716-446655440003')
      const note = new ProgressNote(
        'note-123',
        'Patient showed improvement in articulation',
        new Date('2024-01-20'),
        userId,
        new Date('2024-01-20'),
        'treatment'
      )

      mockSupabaseClient.from().insert.mockResolvedValue({ error: null })

      await repository.addProgressNote(recordId, note)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('medical_record_progress_notes')
    })

    it('should throw error when insert fails', async () => {
      const recordId = new MedicalRecordId('550e8400-e29b-41d4-a716-446655440001')
      const userId = new UserId('550e8400-e29b-41d4-a716-446655440003')
      const note = new ProgressNote(
        'note-123',
        'Test note',
        new Date(),
        userId,
        new Date(),
        'treatment'
      )

      // Create a new mock for this specific test
      const mockInsert = jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } })
      const mockFrom = jest.fn(() => ({ insert: mockInsert }))
      mockSupabaseClient.from = mockFrom

      await expect(repository.addProgressNote(recordId, note))
        .rejects.toThrow('Failed to add progress note: Insert failed')
    })
  })

  describe('addAssessment', () => {
    it('should add an assessment to a medical record', async () => {
      const recordId = new MedicalRecordId('550e8400-e29b-41d4-a716-446655440001')
      const userId = new UserId('550e8400-e29b-41d4-a716-446655440003')
      const assessment = new Assessment(
        'assessment-123',
        'Speech Assessment',
        { articulation: 'improved', fluency: 'stable' },
        'Patient shows significant improvement',
        ['Continue current therapy plan', 'Increase session frequency'],
        new Date('2024-01-20'),
        userId
      )

      mockSupabaseClient.from().insert.mockResolvedValue({ error: null })

      await repository.addAssessment(recordId, assessment)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('medical_record_assessments')
    })
  })

  describe('exists', () => {
    it('should return true when record exists', async () => {
      const recordId = new MedicalRecordId('550e8400-e29b-41d4-a716-446655440001')

      // Create a new mock for this specific test
      const mockSingle = jest.fn().mockResolvedValue({ 
        data: { id: '550e8400-e29b-41d4-a716-446655440001' }, 
        error: null 
      })
      const mockIs = jest.fn(() => ({ single: mockSingle }))
      const mockEq = jest.fn(() => ({ is: mockIs }))
      const mockSelect = jest.fn(() => ({ eq: mockEq }))
      const mockFrom = jest.fn(() => ({ select: mockSelect }))
      
      mockSupabaseClient.from = mockFrom

      const result = await repository.exists(recordId)

      expect(result).toBe(true)
    })

    it('should return false when record does not exist', async () => {
      const recordId = new MedicalRecordId('550e8400-e29b-41d4-a716-446655440002')

      mockSupabaseClient.from().select().eq().is().single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      })

      const result = await repository.exists(recordId)

      expect(result).toBe(false)
    })
  })

  describe('delete', () => {
    it('should soft delete a medical record', async () => {
      const recordId = new MedicalRecordId('550e8400-e29b-41d4-a716-446655440001')

      // Create a new mock for this specific test
      const mockEq = jest.fn().mockResolvedValue({ error: null })
      const mockUpdate = jest.fn(() => ({ eq: mockEq }))
      const mockFrom = jest.fn(() => ({ update: mockUpdate }))
      
      mockSupabaseClient.from = mockFrom

      await repository.delete(recordId)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('medical_records')
    })

    it('should throw error when delete fails', async () => {
      const recordId = new MedicalRecordId('550e8400-e29b-41d4-a716-446655440001')

      // Create a new mock for this specific test
      const mockEq = jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
      const mockUpdate = jest.fn(() => ({ eq: mockEq }))
      const mockFrom = jest.fn(() => ({ update: mockUpdate }))
      
      mockSupabaseClient.from = mockFrom

      await expect(repository.delete(recordId)).rejects.toThrow('Failed to delete medical record: Delete failed')
    })
  })
})