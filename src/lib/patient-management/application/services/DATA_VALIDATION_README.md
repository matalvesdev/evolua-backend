# Data Validation Service

## Overview

The Data Validation Service provides comprehensive data validation and integrity checking for the Patient Management System. It implements field format validation, business rule validation, referential integrity checks, and bulk data import validation as specified in Requirements 6.1, 6.2, 6.4, 6.5, and 6.6.

## Features

### 1. Field Format Validation (Requirement 6.1, 6.5)

Validates all patient data fields according to healthcare standards and Brazilian regulations:

- **Personal Information**
  - Full name (minimum 2 parts, valid characters, length constraints)
  - Date of birth (valid date, age calculations, minor/elderly warnings)
  - Gender (valid values in Portuguese and English)
  - CPF (Brazilian tax ID with checksum validation)
  - RG (Brazilian ID card with format validation)

- **Contact Information**
  - Phone numbers (Brazilian format validation for landline and mobile)
  - Email addresses (RFC-compliant validation)
  - Address (complete Brazilian address with state code validation)

- **Emergency Contact**
  - Name validation
  - Relationship validation
  - Contact information validation

- **Insurance Information**
  - Provider name validation
  - Policy number format validation
  - Expiration date validation with warnings

### 2. Business Rule Validation (Requirement 6.1, 6.5)

Enforces healthcare-specific business rules:

- Emergency contact cannot be the same person as the patient
- Emergency contact phone should differ from patient phone
- Duplicate patient detection using name, DOB, and CPF
- Insurance policy expiration warnings
- Age-based protocol warnings (minors, infants, elderly)

### 3. Referential Integrity Checks (Requirement 6.2)

Ensures data consistency across related entities:

- Validates patient existence before accessing related records
- Checks medical record references to patients
- Verifies document references to patients
- Detects orphaned records (records without valid parent references)
- Identifies mismatched references across entities

### 4. Bulk Data Import Validation (Requirement 6.4)

Validates large datasets efficiently:

- Processes multiple patient records in a single operation
- Provides detailed error reporting per record
- Calculates success rates and validation statistics
- Identifies both errors and warnings for each record
- Supports CSV import workflows

### 5. Clear Error Messages (Requirement 6.6)

Provides actionable feedback:

- Descriptive error messages for each validation failure
- Suggested fixes for common validation errors
- Severity levels (error vs. critical)
- Human-readable validation summaries
- Field-level error reporting

## Usage

### Basic Patient Validation

```typescript
import { DataValidationService } from './application/services/DataValidationService'

const validationService = new DataValidationService(
  patientRepository,
  medicalRecordRepository,
  documentRepository
)

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
    email: 'joao.silva@example.com',
    address: {
      street: 'Rua das Flores',
      number: '123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      country: 'Brasil'
    }
  },
  emergencyContact: {
    name: 'Maria Silva',
    relationship: 'spouse',
    phone: '(11) 91234-5678'
  }
}

const result = await validationService.validatePatientData(patientData)

if (result.isValid) {
  console.log('Patient data is valid')
} else {
  console.log('Validation errors:', result.errors)
  console.log(validationService.getValidationSummary(result))
}
```

### Referential Integrity Check

```typescript
import { PatientId } from './domain/value-objects/PatientId'

const patientId = new PatientId('550e8400-e29b-41d4-a716-446655440000')
const integrityResult = await validationService.checkReferentialIntegrity(patientId)

if (!integrityResult.isValid) {
  console.log('Integrity violations:', integrityResult.violations)
}
```

### Bulk Data Validation

```typescript
const bulkData = [
  // Array of patient data objects
]

const bulkResult = await validationService.validateBulkPatientData(bulkData)

console.log(`Valid: ${bulkResult.validRecords}/${bulkResult.totalRecords}`)
console.log(`Success Rate: ${(bulkResult.validRecords / bulkResult.totalRecords * 100).toFixed(2)}%`)
```

### Business Rules Validation

```typescript
const businessRulesResult = await validationService.validateBusinessRules(patientData)

if (businessRulesResult.warnings.length > 0) {
  console.log('Business rule warnings:', businessRulesResult.warnings)
}
```

## Validation Result Structure

### ValidationResult

```typescript
{
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  fieldResults: FieldValidationResult[]
}
```

### ValidationError

```typescript
{
  field: string
  message: string
  code: string
  severity: 'error' | 'critical'
  suggestedFix?: string
}
```

### ReferentialIntegrityResult

```typescript
{
  isValid: boolean
  violations: ReferentialIntegrityViolation[]
}
```

### BulkValidationResult

```typescript
{
  totalRecords: number
  validRecords: number
  invalidRecords: number
  errors: Array<{ recordIndex: number; recordData: any; errors: ValidationError[] }>
  warnings: Array<{ recordIndex: number; recordData: any; warnings: ValidationWarning[] }>
}
```

## Error Codes

- `INVALID_NAME` - Name format validation failed
- `INVALID_DATE_OF_BIRTH` - Date of birth validation failed
- `INVALID_GENDER` - Gender value is not valid
- `INVALID_CPF` - CPF format or checksum validation failed
- `INVALID_RG` - RG format validation failed
- `INVALID_PRIMARY_PHONE` - Primary phone validation failed
- `INVALID_SECONDARY_PHONE` - Secondary phone validation failed
- `INVALID_EMAIL` - Email format validation failed
- `INVALID_ADDRESS` - Address validation failed
- `INVALID_EMERGENCY_CONTACT_NAME` - Emergency contact name validation failed
- `INVALID_RELATIONSHIP` - Relationship validation failed
- `INVALID_EMERGENCY_PHONE` - Emergency contact phone validation failed
- `INVALID_INSURANCE_PROVIDER` - Insurance provider validation failed
- `INVALID_POLICY_NUMBER` - Policy number validation failed
- `INVALID_INSURANCE_VALID_UNTIL` - Insurance expiration date validation failed

## Warning Codes

- `CPF_WARNING` - CPF already exists in the system
- `DATE_OF_BIRTH_WARNING` - Age-related warnings (minor, infant, elderly)
- `SAME_EMERGENCY_CONTACT` - Emergency contact appears to be the same as patient
- `SAME_EMERGENCY_PHONE` - Emergency phone is the same as patient phone
- `POTENTIAL_DUPLICATE` - Potential duplicate patient found
- `EXPIRED_INSURANCE` - Insurance policy has expired
- `INSURANCE_EXPIRING_SOON` - Insurance policy expiring within 30 days

## Integration Points

The Data Validation Service integrates with:

1. **Patient Registry** - Validates patient data before creation/update
2. **Medical Record Manager** - Checks referential integrity for medical records
3. **Document Manager** - Validates document references
4. **Bulk Import Workflows** - Validates CSV/Excel imports
5. **API Layer** - Provides validation for REST endpoints

## Testing

Comprehensive unit tests are provided in:
- `__tests__/application/services/DataValidationService.test.ts`

Example usage is demonstrated in:
- `examples/data-validation-usage.ts`

## Performance Considerations

- Field validation is performed synchronously for fast feedback
- Database checks (CPF duplicates, referential integrity) are asynchronous
- Bulk validation processes records sequentially to avoid overwhelming the database
- Validation results are cacheable for repeated validations

## Future Enhancements

- Async validation for improved performance on large datasets
- Custom validation rule engine for configurable business rules
- Integration with external validation services (address verification, etc.)
- Validation rule versioning for audit compliance
- Machine learning-based duplicate detection
