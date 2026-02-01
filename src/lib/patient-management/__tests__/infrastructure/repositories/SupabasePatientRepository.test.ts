// ============================================================================
// SUPABASE PATIENT REPOSITORY TESTS
// Unit tests for the Supabase Patient Repository implementation
// ============================================================================

import { SupabasePatientRepository } from '../../../infrastructure/repositories/SupabasePatientRepository'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { PatientStatus } from '../../../domain/value-objects/PatientStatus'

describe('SupabasePatientRepository', () => {
  let repository: SupabasePatientRepository
  const mockClinicId = '550e8400-e29b-41d4-a716-446655440000'
  const mockTherapistId = '550e8400-e29b-41d4-a716-446655440001'

  // Simple mock that doesn't execute actual database operations
  const mockSupabaseClient = {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          limit: jest.fn()
        })),
        or: jest.fn(),
        lte: jest.fn(),
        gte: jest.fn(),
        ilike: jest.fn(),
        order: jest.fn(),
        range: jest.fn(),
        limit: jest.fn()
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }

  beforeEach(() => {
    repository = new SupabasePatientRepository(
      mockSupabaseClient as any,
      mockClinicId,
      mockTherapistId
    )
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined()
      expect(repository).toBeInstanceOf(SupabasePatientRepository)
    })
  })

  describe('existsByCpf', () => {
    it('should return true when CPF exists', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        data: [{ id: '550e8400-e29b-41d4-a716-446655440002' }],
        error: null
      })
      const mockEq = jest.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      
      mockSupabaseClient.from = mockFrom

      const result = await repository.existsByCpf('11144477735')

      expect(result).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('patients')
    })

    it('should return false when CPF does not exist', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
      const mockEq = jest.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      
      mockSupabaseClient.from = mockFrom

      const result = await repository.existsByCpf('11144477735')

      expect(result).toBe(false)
    })

    it('should throw error when database query fails', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })
      const mockEq = jest.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      
      mockSupabaseClient.from = mockFrom

      await expect(repository.existsByCpf('11144477735'))
        .rejects.toThrow('Failed to check CPF existence: Database error')
    })
  })

  describe('count', () => {
    it('should return total patient count', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        count: 10,
        error: null
      })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      
      mockSupabaseClient.from = mockFrom

      const result = await repository.count()

      expect(result).toBe(10)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('patients')
    })
  })

  describe('countByStatus', () => {
    it('should count active patients correctly', async () => {
      const status = new PatientStatus('active')

      const mockEq = jest.fn().mockResolvedValue({
        count: 5,
        error: null
      })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      
      mockSupabaseClient.from = mockFrom

      const result = await repository.countByStatus(status)

      expect(result).toBe(5)
    })
  })

  describe('delete', () => {
    it('should delete patient successfully', async () => {
      const patientId = new PatientId('550e8400-e29b-41d4-a716-446655440002')

      const mockEq = jest.fn().mockResolvedValue({ error: null })
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete })
      
      mockSupabaseClient.from = mockFrom

      await expect(repository.delete(patientId)).resolves.not.toThrow()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('patients')
    })

    it('should throw error when deletion fails', async () => {
      const patientId = new PatientId('550e8400-e29b-41d4-a716-446655440002')

      const mockEq = jest.fn().mockResolvedValue({ 
        error: { message: 'Delete failed' } 
      })
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete })
      
      mockSupabaseClient.from = mockFrom

      await expect(repository.delete(patientId))
        .rejects.toThrow('Failed to delete patient: Delete failed')
    })
  })
})