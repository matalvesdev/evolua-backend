# Patient Management System

A comprehensive, LGPD-compliant patient management system for speech therapists (fonoaudiólogos) built with clean architecture principles and domain-driven design.

## Overview

The Patient Management System provides complete patient lifecycle management, from registration through treatment tracking, with built-in LGPD compliance, audit logging, and seamless integration with appointment and reporting systems.

## Architecture

The system follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  (React Components, Hooks, UI)                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (Services, Use Cases, Business Logic)                      │
│  - PatientRegistry                                           │
│  - MedicalRecordManager                                      │
│  - DocumentManager                                           │
│  - StatusTracker                                             │
│  - LGPDComplianceEngine                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  (Entities, Value Objects, Domain Logic)                    │
│  - Patient, MedicalRecord, Document                          │
│  - PatientId, PersonalInformation, ContactInformation        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  (Repositories, External Services, Integrations)             │
│  - SupabasePatientRepository                                 │
│  - AuditLogger, EncryptionService                            │
│  - IntegrationHub                                            │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

The system is already integrated into the project. No additional installation required.

### Initialization

**Client-Side (React Components):**

```typescript
// In your root layout or providers file
import { initializePatientManagement } from '@/lib/patient-management'

// Initialize once at app startup
if (typeof window !== 'undefined') {
  initializePatientManagement()
}
```

**Server-Side (API Routes):**

```typescript
import { getPatientManagementServer } from '@/lib/patient-management'

export async function GET() {
  const pm = await getPatientManagementServer()
  // Use pm...
}
```

### Basic Usage

**Using React Hooks:**

```typescript
import { usePatientOperations } from '@/lib/patient-management'

function MyComponent() {
  const { registerPatient, searchPatients } = usePatientOperations()
  
  // Register a patient
  const patient = await registerPatient({
    fullName: 'Maria Silva',
    dateOfBirth: new Date('1990-01-01'),
    // ... other fields
  })
  
  // Search patients
  const results = await searchPatients({
    searchTerm: 'Maria',
    page: 1,
    pageSize: 10
  })
}
```

**Using the Facade:**

```typescript
import { getPatientManagement } from '@/lib/patient-management'

const pm = getPatientManagement()

// All operations available through the facade
const patient = await pm.registerPatient(patientData, userId)
const medicalRecord = await pm.createMedicalRecord(patientId, recordData, userId)
const document = await pm.uploadDocument(patientId, file, userId)
```

## Core Features

### 1. Patient Management
- Complete patient registration and profile management
- Duplicate detection and merging
- Advanced search and filtering
- Status lifecycle tracking

### 2. Medical Records
- Comprehensive medical history tracking
- Treatment timeline visualization
- Progress notes and assessments
- Clinical data validation

### 3. Document Management
- Secure document upload and storage
- File encryption and virus scanning
- Version control
- Document lifecycle management

### 4. LGPD Compliance
- Consent management
- Data access logging
- Data portability (export)
- Secure data deletion
- Encryption at rest and in transit

### 5. Integration
- Seamless appointment system integration
- Report generation support
- Real-time data synchronization
- Error handling and fallback mechanisms

### 6. Audit & Security
- Comprehensive audit trails
- Access logging
- Security monitoring
- Suspicious activity detection

## Module Structure

```
patient-management/
├── domain/                    # Domain entities and value objects
│   ├── entities/             # Patient, MedicalRecord, Document
│   └── value-objects/        # PatientId, PersonalInformation, etc.
├── application/              # Application services and use cases
│   └── services/            # PatientRegistry, MedicalRecordManager, etc.
├── infrastructure/          # Infrastructure implementations
│   ├── repositories/        # Database repositories
│   ├── services/           # Audit, encryption, security
│   ├── integration/        # External system integrations
│   ├── factories/          # Dependency injection
│   └── api/                # API handlers and middleware
├── hooks/                   # React hooks
├── examples/               # Usage examples
├── testing/                # Test utilities and generators
├── client.ts              # Client-side initialization
├── server.ts              # Server-side initialization
└── PatientManagementFacade.ts  # Simplified API facade
```

## Available Services

### Core Services
- **PatientRegistry**: Patient CRUD operations, search, duplicate detection
- **MedicalRecordManager**: Medical history, treatment timelines
- **DocumentManager**: Document upload, storage, retrieval
- **StatusTracker**: Patient status lifecycle management

### LGPD Compliance Services
- **LGPDComplianceEngine**: Consent, access control, encryption
- **DataPortabilityService**: Data export in multiple formats
- **DataDeletionService**: Secure data deletion with audit trails

### Infrastructure Services
- **AuditLogger**: Comprehensive activity logging
- **EncryptionService**: Data encryption/decryption
- **SecurityMonitoringService**: Security alerts and monitoring
- **IntegrationHub**: External system integrations

### Advanced Features
- **AdvancedSearchService**: Multi-criteria search with autocomplete
- **DataValidationService**: Comprehensive data validation
- **SearchPerformanceOptimizer**: Query optimization

## React Hooks

```typescript
// Main hook
usePatientManagement()          // Access the facade

// Specialized hooks
usePatientOperations()          // Patient CRUD
useMedicalRecordOperations()   // Medical records
useDocumentOperations()         // Documents
useStatusOperations()           // Status tracking
```

## API Integration

The system provides pre-built API handlers:

```typescript
// app/api/patient-management/patients/route.ts
import { handlePatientRequest } from '@/lib/patient-management/infrastructure/api'

export const GET = handlePatientRequest
export const POST = handlePatientRequest
```

Or create custom endpoints:

```typescript
import { getPatientManagementServer } from '@/lib/patient-management'

export async function GET(request: NextRequest) {
  const pm = await getPatientManagementServer()
  const patients = await pm.searchPatients(criteria)
  return NextResponse.json(patients)
}
```

## Documentation

- **[Integration Guide](./INTEGRATION_GUIDE.md)**: Complete integration instructions
- **[API Reference](../../docs/API_REFERENCE.md)**: Detailed API documentation
- **[Component Specs](../../docs/COMPONENT_SPECS.md)**: Component specifications
- **[Technical Specs](../../docs/TECHNICAL_SPECS.md)**: Technical architecture

## Examples

See the `examples/` directory for complete working examples:

- `patient-registry-usage.ts` - Patient operations
- `medical-record-manager-usage.ts` - Medical records
- `document-manager-usage.ts` - Document management
- `integration-hub-usage.ts` - System integrations
- `advanced-search-usage.ts` - Advanced search
- `end-to-end-integration.ts` - Complete workflows

## Testing

The system includes comprehensive testing utilities:

```typescript
import { generatePatient, generateMedicalRecord } from '@/lib/patient-management/testing/generators'

// Generate test data
const testPatient = generatePatient()
const testRecord = generateMedicalRecord()
```

## Security

- All sensitive data is encrypted at rest
- Comprehensive audit logging for all operations
- LGPD-compliant data handling
- Role-based access control
- Automatic security monitoring

## Performance

- Optimized database queries with indexes
- Pagination for large result sets
- Caching strategies for frequently accessed data
- Async operations for heavy processing
- Connection pooling

## Error Handling

The system provides comprehensive error handling:

- Validation errors with clear messages
- Automatic retry mechanisms for transient failures
- Circuit breakers for external integrations
- Graceful degradation
- Detailed error logging

## Support

For issues or questions:
1. Check the [Integration Guide](./INTEGRATION_GUIDE.md)
2. Review the [examples](./examples/)
3. Consult the API documentation
4. Check the test files for usage patterns

## License

Proprietary - Evolua CRM Platform
