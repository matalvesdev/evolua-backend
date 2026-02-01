# Patient Management Infrastructure Layer

This directory contains the infrastructure layer implementation for the Patient Management System, providing data persistence and external system integration capabilities.

## Overview

The infrastructure layer implements the repository pattern to abstract data persistence operations, allowing the domain layer to remain independent of specific database technologies or external services.

## Components

### Repositories

#### IPatientRepository Interface
- **Location**: `repositories/IPatientRepository.ts`
- **Purpose**: Defines the contract for patient data persistence operations
- **Key Methods**:
  - `create()` - Create new patient records
  - `findById()` - Retrieve patients by ID
  - `update()` - Update existing patient data
  - `delete()` - Remove patient records
  - `search()` - Advanced search with criteria and pagination
  - `findByStatus()` - Filter patients by status
  - `findByName()` - Search patients by name
  - `findByContact()` - Search by phone/email
  - `existsByCpf()` - Check CPF uniqueness
  - `findPotentialDuplicates()` - Duplicate detection
  - `count()` - Get total patient count
  - `countByStatus()` - Count patients by status

#### SupabasePatientRepository Implementation
- **Location**: `repositories/SupabasePatientRepository.ts`
- **Purpose**: Concrete implementation using Supabase PostgreSQL
- **Features**:
  - Full CRUD operations
  - Advanced search and filtering
  - Pagination support
  - Duplicate detection
  - Error handling and validation
  - Data mapping between database and domain models

### Factories

#### PatientRepositoryFactory
- **Location**: `factories/PatientRepositoryFactory.ts`
- **Purpose**: Centralized creation of repository instances
- **Methods**:
  - `createSupabaseRepository()` - Create configured Supabase repository
  - `createDefault()` - Create repository with environment defaults

## Data Mapping

The repository implementation handles mapping between:

### Database Schema → Domain Models
- Database rows are converted to domain entities and value objects
- Handles data validation and transformation
- Provides default values for missing fields
- Ensures data integrity

### Domain Models → Database Schema
- Domain entities are serialized to database format
- Handles complex value objects (Address, PhoneNumber, CPF, etc.)
- Maintains referential integrity
- Supports partial updates

## Current Database Schema Compatibility

The implementation works with the existing database schema:

```sql
patients (
  id UUID PRIMARY KEY,
  clinic_id UUID,
  therapist_id UUID,
  full_name VARCHAR,
  date_of_birth DATE,
  cpf VARCHAR,
  rg VARCHAR,
  gender VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  zip_code VARCHAR,
  emergency_contact_name VARCHAR,
  emergency_contact_phone VARCHAR,
  active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Limitations and Future Improvements

### Current Limitations
1. **Simplified Status Mapping**: The current schema only has an `active` boolean field, which is mapped to the domain's more complex status system
2. **Missing Fields**: Some domain fields like insurance information, medical records, and detailed status history are not yet in the database schema
3. **Address Storage**: Address is stored as a single string field instead of structured components

### Planned Improvements
1. **Enhanced Database Schema**: Update schema to match the full design requirements
2. **Status History**: Add proper status tracking with history
3. **Medical Records Integration**: Add support for medical record relationships
4. **Document Management**: Integrate with file storage for patient documents
5. **Audit Logging**: Add comprehensive audit trail functionality

## Usage Examples

### Basic Usage
```typescript
import { createClient } from '@/lib/supabase/client'
import { PatientRepositoryFactory } from './infrastructure'

const supabase = createClient()
const repository = PatientRepositoryFactory.createDefault(
  supabase,
  'user-id',
  'clinic-id'
)

// Create patient
const patient = await repository.create(patientData, 'user-id')

// Find by ID
const found = await repository.findById(patient.id)

// Search
const results = await repository.search(
  { query: 'João' },
  { page: 1, limit: 10 }
)
```

### Advanced Search
```typescript
const results = await repository.search(
  {
    query: 'Silva',
    status: new PatientStatus('active'),
    ageRange: { min: 18, max: 65 },
    createdAfter: new Date('2024-01-01')
  },
  { 
    page: 1, 
    limit: 20, 
    sortBy: 'createdAt', 
    sortOrder: 'desc' 
  }
)
```

## Testing

The infrastructure layer includes comprehensive unit tests:

- **Repository Interface Tests**: Verify contract compliance
- **Supabase Implementation Tests**: Test database operations with mocks
- **Error Handling Tests**: Ensure proper error propagation
- **Data Mapping Tests**: Verify correct transformation between layers

Run tests with:
```bash
npm test -- --testPathPatterns="SupabasePatientRepository"
```

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 1.1**: Patient registration and profile management ✅
- **Requirement 1.5**: Patient data storage and retrieval ✅
- **Requirement 7.1**: Search by name, ID, phone, email ✅
- **Requirement 7.2**: Filtering by status, age range, diagnosis ✅

## Integration Points

The repository integrates with:

- **Supabase Client**: Database operations
- **Domain Layer**: Entity and value object mapping
- **Authentication**: User context for operations
- **Error Handling**: Consistent error propagation

## Security Considerations

- **Input Validation**: All inputs are validated through domain value objects
- **SQL Injection Prevention**: Uses Supabase's parameterized queries
- **Access Control**: Repository operations include user context
- **Data Sanitization**: Proper data cleaning and validation

## Performance Considerations

- **Pagination**: All list operations support pagination
- **Indexing**: Relies on database indexes for search performance
- **Query Optimization**: Uses efficient Supabase query patterns
- **Connection Pooling**: Leverages Supabase's connection management