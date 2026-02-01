// ============================================================================
// DATA VALIDATION PROPERTY TESTS
// Property-based tests for comprehensive data validation consistency
// Feature: patient-management-system, Property 2: Comprehensive Data Validation Consistency
// **Validates: Requirements 1.2, 2.5, 6.1, 6.5**
// ============================================================================

import * as fc from 'fast-check'
import { DataValidationService } from '../../application/services/DataValidationService'
import { PatientDataForValidation } from '../../application/services/DataValidationService'
import { IPatientRepository } from '../../infrastructure/repositories/IPatientRepository'
import { IMedicalRecordRepository } from '../../infrastructure/repositories/IMedicalRecordRepository'
import { IDocumentRepository } from '../../infrastructure/repositories/IDocumentRepository'
import { Patient } from '../../domain/entities/Patient'
import {
  personalInformationGenerator,
  contactInformationGenerator,
  emergencyContactGenerator
} from '../../testing/generators'

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

class MockPatientRepository implements Partial<IPatientRepository> {
  async existsByCpf(_cpf: string): Promise<boolean> {
    return false // No duplicates for property tests
  }

  async findPotentialDuplicates(_personalInfo: {
    fullName: string
    dateOfBirth: Date
    cpf?: string
  }): Promise<Patient[]> {
    return [] // No duplicates for property tests
  }
}

class MockMedicalRecordRepository implements Partial<IMedicalRecordRepository> {}

class MockDocumentRepository implements Partial<IDocumentRepository> {}

// ============================================================================
// CUSTOM GENERATORS FOR VALIDATION TESTING
// ============================================================================

/**
 * Generator for complete patient data
 */
const patientDataGenerator = (): fc.Arbitrary<PatientDataForValidation> =>
  fc.record({
    personalInfo: fc.record({
      fullName: personalInformationGenerator().map(p => p.fullName.value),
      dateOfBirth: personalInformationGenerator().map(p => p.dateOfBirth),
      gender: personalInformationGenerator().map(p => p.gender.value),
      cpf: personalInformationGenerator().map(p => p.cpf.value),
      rg: personalInformationGenerator().map(p => p.rg.value)
    }),
    contactInfo: fc.record({
      primaryPhone: contactInformationGenerator().map(c => c.primaryPhone.value),
      secondaryPhone: fc.option(contactInformationGenerator().map(c => c.secondaryPhone?.value || '')),
      email: fc.option(contactInformationGenerator().map(c => c.email?.value || '')),
      address: contactInformationGenerator().map(c => ({
        street: c.address.street,
        number: c.address.number,
        complement: c.address.complement || undefined,
        neighborhood: c.address.neighborhood,
        city: c.address.city,
        state: c.address.state,
        zipCode: c.address.zipCode,
        country: 'Brasil'
      }))
    }),
    emergencyContact: fc.record({
      name: emergencyContactGenerator().map(e => e.name.value),
      relationship: emergencyContactGenerator().map(e => e.relationship),
      phone: emergencyContactGenerator().map(e => e.phone.value),
      email: fc.option(fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s) && s.length >= 1),
        fc.constantFrom('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com')
      ).map(([local, domain]) => `${local}@${domain}`))
    }),
    insuranceInfo: fc.option(
      fc.record({
        provider: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
        policyNumber: fc.option(fc.string({ minLength: 5, maxLength: 20 })),
        groupNumber: fc.option(fc.string({ minLength: 3, maxLength: 20 })),
        validUntil: fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }))
      })
    )
  })

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 2: Comprehensive Data Validation Consistency', () => {
  let validationService: DataValidationService
  let mockPatientRepo: MockPatientRepository
  let mockMedicalRecordRepo: MockMedicalRecordRepository
  let mockDocumentRepo: MockDocumentRepository

  beforeEach(() => {
    mockPatientRepo = new MockPatientRepository()
    mockMedicalRecordRepo = new MockMedicalRecordRepository()
    mockDocumentRepo = new MockDocumentRepository()
    
    validationService = new DataValidationService(
      mockPatientRepo as IPatientRepository,
      mockMedicalRecordRepo as IMedicalRecordRepository,
      mockDocumentRepo as IDocumentRepository
    )
  })

  /**
   * Property: Validation is deterministic
   * For any patient data, validating it multiple times should produce the same result
   */
  test('validation produces consistent results across multiple invocations', async () => {
    await fc.assert(
      fc.asyncProperty(patientDataGenerator(), async (patientData) => {
        const result1 = await validationService.validatePatientData(patientData)
        const result2 = await validationService.validatePatientData(patientData)
        
        // Results should be identical
        expect(result1.isValid).toBe(result2.isValid)
        expect(result1.errors.length).toBe(result2.errors.length)
        expect(result1.warnings.length).toBe(result2.warnings.length)
        expect(result1.fieldResults.length).toBe(result2.fieldResults.length)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Valid data passes validation
   * For any valid patient data generated by our generators, validation should pass
   */
  test('valid patient data passes validation', async () => {
    await fc.assert(
      fc.asyncProperty(patientDataGenerator(), async (patientData) => {
        const result = await validationService.validatePatientData(patientData)
        
        // Valid data should pass validation
        expect(result.isValid).toBe(true)
        expect(result.errors.length).toBe(0)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Validation always returns a result
   * For any patient data (valid or invalid), validation should always return a result
   */
  test('validation always returns a complete result structure', async () => {
    await fc.assert(
      fc.asyncProperty(patientDataGenerator(), async (patientData) => {
        const result = await validationService.validatePatientData(patientData)
        
        // Result should have all required properties
        expect(result).toHaveProperty('isValid')
        expect(result).toHaveProperty('errors')
        expect(result).toHaveProperty('warnings')
        expect(result).toHaveProperty('fieldResults')
        
        // Properties should be of correct types
        expect(typeof result.isValid).toBe('boolean')
        expect(Array.isArray(result.errors)).toBe(true)
        expect(Array.isArray(result.warnings)).toBe(true)
        expect(Array.isArray(result.fieldResults)).toBe(true)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Field validation is comprehensive
   * For any patient data, all required fields should be validated
   */
  test('validation checks all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(patientDataGenerator(), async (patientData) => {
        const result = await validationService.validatePatientData(patientData)
        
        // Should have field results for all major sections
        const fieldNames = result.fieldResults.map(fr => fr.field)
        
        // Check that personal info fields are validated
        expect(fieldNames.some(f => f.includes('fullName') || f === 'fullName')).toBe(true)
        expect(fieldNames.some(f => f.includes('dateOfBirth') || f === 'dateOfBirth')).toBe(true)
        expect(fieldNames.some(f => f.includes('gender') || f === 'gender')).toBe(true)
        expect(fieldNames.some(f => f.includes('cpf') || f === 'cpf')).toBe(true)
        
        // Check that contact info fields are validated
        expect(fieldNames.some(f => f.includes('primaryPhone') || f === 'primaryPhone')).toBe(true)
        expect(fieldNames.some(f => f.includes('address') || f === 'address')).toBe(true)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Errors have required information
   * For any validation errors, they should contain all required information
   */
  test('validation errors contain complete information', async () => {
    await fc.assert(
      fc.asyncProperty(patientDataGenerator(), async (patientData) => {
        const result = await validationService.validatePatientData(patientData)
        
        // Check all errors have required properties
        result.errors.forEach(error => {
          expect(error).toHaveProperty('field')
          expect(error).toHaveProperty('message')
          expect(error).toHaveProperty('code')
          expect(error).toHaveProperty('severity')
          
          expect(typeof error.field).toBe('string')
          expect(typeof error.message).toBe('string')
          expect(typeof error.code).toBe('string')
          expect(['error', 'critical']).toContain(error.severity)
          
          // Message should not be empty
          expect(error.message.length).toBeGreaterThan(0)
        })
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Validation result consistency
   * If validation passes, there should be no errors
   * If validation fails, there should be at least one error
   */
  test('validation result is consistent with error count', async () => {
    await fc.assert(
      fc.asyncProperty(patientDataGenerator(), async (patientData) => {
        const result = await validationService.validatePatientData(patientData)
        
        if (result.isValid) {
          expect(result.errors.length).toBe(0)
        } else {
          expect(result.errors.length).toBeGreaterThan(0)
        }
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Business rules validation is consistent
   * Business rules should be applied consistently regardless of input source
   */
  test('business rules are applied consistently', async () => {
    await fc.assert(
      fc.asyncProperty(patientDataGenerator(), async (patientData) => {
        const result = await validationService.validateBusinessRules(patientData)
        
        // Result should have all required properties
        expect(result).toHaveProperty('isValid')
        expect(result).toHaveProperty('errors')
        expect(result).toHaveProperty('warnings')
        
        // Business rules should not produce critical errors for valid data
        const criticalErrors = result.errors.filter(e => e.severity === 'critical')
        expect(criticalErrors.length).toBe(0)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Bulk validation consistency
   * Bulk validation should produce the same results as individual validation
   */
  test('bulk validation is consistent with individual validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientDataGenerator(), { minLength: 1, maxLength: 10 }),
        async (patientDataArray) => {
          const bulkResult = await validationService.validateBulkPatientData(patientDataArray)
          
          // Bulk result should have correct structure
          expect(bulkResult.totalRecords).toBe(patientDataArray.length)
          expect(bulkResult.validRecords + bulkResult.invalidRecords).toBe(patientDataArray.length)
          
          // Validate each record individually and compare
          let individualValidCount = 0
          for (const patientData of patientDataArray) {
            const individualResult = await validationService.validatePatientData(patientData)
            if (individualResult.isValid) {
              individualValidCount++
            }
          }
          
          // Bulk validation should match individual validation
          expect(bulkResult.validRecords).toBe(individualValidCount)
          
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property: Validation summary is informative
   * For any validation result, the summary should provide useful information
   */
  test('validation summary provides complete information', async () => {
    await fc.assert(
      fc.asyncProperty(patientDataGenerator(), async (patientData) => {
        const result = await validationService.validatePatientData(patientData)
        const summary = validationService.getValidationSummary(result)
        
        // Summary should not be empty
        expect(summary.length).toBeGreaterThan(0)
        
        // Summary should contain validation result
        expect(summary).toContain(result.isValid ? 'PASSED' : 'FAILED')
        
        // Summary should mention error count
        expect(summary).toContain(`Total Errors: ${result.errors.length}`)
        
        // Summary should mention warning count
        expect(summary).toContain(`Total Warnings: ${result.warnings.length}`)
        
        return true
      }),
      { numRuns: 100 }
    )
  })
})
