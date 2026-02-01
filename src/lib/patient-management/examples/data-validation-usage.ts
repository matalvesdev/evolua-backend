// ============================================================================
// DATA VALIDATION SERVICE USAGE EXAMPLES
// Demonstrates how to use the DataValidationService
// Requirements: 6.1, 6.2, 6.4, 6.5, 6.6
// ============================================================================

import { DataValidationService } from '../application/services/DataValidationService'
import { PatientId } from '../domain/value-objects/PatientId'

/**
 * Example 1: Validate patient data before creation
 */
export async function validateNewPatient(
  validationService: DataValidationService
) {
  const patientData = {
    personalInfo: {
      fullName: 'João Silva Santos',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'male',
      cpf: '123.456.789-09',
      rg: '12.345.678-9'
    },
    contactInfo: {
      primaryPhone: '(11) 98765-4321',
      secondaryPhone: '(11) 3456-7890',
      email: 'joao.silva@example.com',
      address: {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 45',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        country: 'Brasil'
      }
    },
    emergencyContact: {
      name: 'Maria Silva',
      relationship: 'spouse',
      phone: '(11) 91234-5678',
      email: 'maria.silva@example.com'
    },
    insuranceInfo: {
      provider: 'Unimed',
      policyNumber: 'POL123456',
      groupNumber: 'GRP789',
      validUntil: new Date('2025-12-31')
    }
  }

  // Validate patient data
  const validationResult = await validationService.validatePatientData(patientData)

  if (validationResult.isValid) {
    console.log('✓ Patient data is valid')
    console.log('Warnings:', validationResult.warnings.length)
  } else {
    console.log('✗ Patient data validation failed')
    console.log('Errors:', validationResult.errors)
    
    // Get human-readable summary
    const summary = validationService.getValidationSummary(validationResult)
    console.log('\nValidation Summary:')
    console.log(summary)
  }

  return validationResult
}

/**
 * Example 2: Check referential integrity for a patient
 */
export async function checkPatientIntegrity(
  validationService: DataValidationService,
  patientId: string
) {
  const pid = new PatientId(patientId)

  // Check referential integrity
  const integrityResult = await validationService.checkReferentialIntegrity(pid)

  if (integrityResult.isValid) {
    console.log('✓ All references are valid')
  } else {
    console.log('✗ Referential integrity violations found:')
    integrityResult.violations.forEach((violation, index) => {
      console.log(`\n${index + 1}. ${violation.violationType}`)
      console.log(`   Entity: ${violation.entityType} (${violation.entityId})`)
      console.log(`   References: ${violation.referencedEntityType} (${violation.referencedEntityId})`)
      console.log(`   Message: ${violation.message}`)
    })
  }

  return integrityResult
}

/**
 * Example 3: Validate bulk patient data import
 */
export async function validateBulkImport(
  validationService: DataValidationService,
  csvData: any[]
) {
  // Transform CSV data to patient data format
  const patientDataArray = csvData.map(row => ({
    personalInfo: {
      fullName: row.fullName,
      dateOfBirth: new Date(row.dateOfBirth),
      gender: row.gender,
      cpf: row.cpf,
      rg: row.rg
    },
    contactInfo: {
      primaryPhone: row.primaryPhone,
      secondaryPhone: row.secondaryPhone,
      email: row.email,
      address: {
        street: row.street,
        number: row.number,
        complement: row.complement,
        neighborhood: row.neighborhood,
        city: row.city,
        state: row.state,
        zipCode: row.zipCode,
        country: row.country || 'Brasil'
      }
    },
    emergencyContact: {
      name: row.emergencyContactName,
      relationship: row.emergencyContactRelationship,
      phone: row.emergencyContactPhone,
      email: row.emergencyContactEmail
    }
  }))

  // Validate bulk data
  const bulkResult = await validationService.validateBulkPatientData(patientDataArray)

  console.log('\n=== Bulk Validation Results ===')
  console.log(`Total Records: ${bulkResult.totalRecords}`)
  console.log(`Valid Records: ${bulkResult.validRecords}`)
  console.log(`Invalid Records: ${bulkResult.invalidRecords}`)
  console.log(`Success Rate: ${((bulkResult.validRecords / bulkResult.totalRecords) * 100).toFixed(2)}%`)

  if (bulkResult.errors.length > 0) {
    console.log('\n=== Validation Errors ===')
    bulkResult.errors.forEach(error => {
      console.log(`\nRecord ${error.recordIndex + 1}:`)
      error.errors.forEach(err => {
        console.log(`  - [${err.field}] ${err.message}`)
        if (err.suggestedFix) {
          console.log(`    Fix: ${err.suggestedFix}`)
        }
      })
    })
  }

  if (bulkResult.warnings.length > 0) {
    console.log('\n=== Validation Warnings ===')
    bulkResult.warnings.forEach(warning => {
      console.log(`\nRecord ${warning.recordIndex + 1}:`)
      warning.warnings.forEach(warn => {
        console.log(`  - [${warn.field}] ${warn.message}`)
      })
    })
  }

  return bulkResult
}

/**
 * Example 4: Validate business rules
 */
export async function validateBusinessRules(
  validationService: DataValidationService
) {
  const patientData = {
    personalInfo: {
      fullName: 'Ana Costa Silva',
      dateOfBirth: new Date('1995-03-20'),
      gender: 'female',
      cpf: '987.654.321-00',
      rg: '98.765.432-1'
    },
    contactInfo: {
      primaryPhone: '(21) 98765-4321',
      address: {
        street: 'Avenida Brasil',
        number: '456',
        neighborhood: 'Copacabana',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22070-011',
        country: 'Brasil'
      }
    },
    emergencyContact: {
      name: 'Pedro Costa',
      relationship: 'spouse',
      phone: '(21) 91234-5678'
    },
    insuranceInfo: {
      provider: 'Amil',
      policyNumber: 'POL789',
      validUntil: new Date('2024-06-30') // Expiring soon
    }
  }

  // Validate business rules
  const businessRulesResult = await validationService.validateBusinessRules(patientData)

  console.log('\n=== Business Rules Validation ===')
  console.log(`Valid: ${businessRulesResult.isValid}`)

  if (businessRulesResult.warnings.length > 0) {
    console.log('\nBusiness Rule Warnings:')
    businessRulesResult.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. [${warning.code}] ${warning.message}`)
    })
  }

  return businessRulesResult
}

/**
 * Example 5: Handle validation errors with suggested fixes
 */
export async function handleValidationWithFixes(
  validationService: DataValidationService
) {
  const invalidData = {
    personalInfo: {
      fullName: 'J', // Too short
      dateOfBirth: new Date('2030-01-01'), // Future date
      gender: 'invalid', // Invalid gender
      cpf: '111.111.111-11', // Invalid CPF
      rg: '123' // Too short
    },
    contactInfo: {
      primaryPhone: '123', // Invalid phone
      email: 'not-an-email', // Invalid email
      address: {
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: 'XX', // Invalid state
        zipCode: '123', // Invalid ZIP
        country: ''
      }
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    }
  }

  const result = await validationService.validatePatientData(invalidData)

  console.log('\n=== Validation Errors with Suggested Fixes ===')
  result.errors.forEach((error, index) => {
    console.log(`\n${index + 1}. Field: ${error.field}`)
    console.log(`   Error: ${error.message}`)
    console.log(`   Code: ${error.code}`)
    console.log(`   Severity: ${error.severity}`)
    if (error.suggestedFix) {
      console.log(`   ✓ Suggested Fix: ${error.suggestedFix}`)
    }
  })

  return result
}

/**
 * Example 6: Integration with patient registration workflow
 */
export async function patientRegistrationWorkflow(
  validationService: DataValidationService,
  patientData: any
) {
  console.log('\n=== Patient Registration Workflow ===')
  
  // Step 1: Validate patient data
  console.log('\n1. Validating patient data...')
  const validationResult = await validationService.validatePatientData(patientData)
  
  if (!validationResult.isValid) {
    console.log('✗ Validation failed. Cannot proceed with registration.')
    console.log(validationService.getValidationSummary(validationResult))
    return { success: false, errors: validationResult.errors }
  }
  
  console.log('✓ Patient data validation passed')
  
  // Step 2: Validate business rules
  console.log('\n2. Validating business rules...')
  const businessRulesResult = await validationService.validateBusinessRules(patientData)
  
  if (businessRulesResult.warnings.length > 0) {
    console.log('⚠ Business rule warnings detected:')
    businessRulesResult.warnings.forEach(w => console.log(`  - ${w.message}`))
  }
  
  console.log('✓ Business rules validation completed')
  
  // Step 3: Proceed with registration
  console.log('\n3. Proceeding with patient registration...')
  console.log('✓ Patient registered successfully')
  
  return {
    success: true,
    warnings: [...validationResult.warnings, ...businessRulesResult.warnings]
  }
}
