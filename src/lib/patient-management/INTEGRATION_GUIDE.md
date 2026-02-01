# Patient Management System - Integration Guide

This guide explains how to integrate the Patient Management System into your application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Client-Side Integration](#client-side-integration)
3. [Server-Side Integration](#server-side-integration)
4. [API Route Integration](#api-route-integration)
5. [React Component Integration](#react-component-integration)
6. [Advanced Usage](#advanced-usage)

## Quick Start

### 1. Initialize the System

The system needs to be initialized once at application startup.

**For Client-Side (App Router):**

```typescript
// app/layout.tsx or app/providers.tsx
import { initializePatientManagement } from '@/lib/patient-management'

// Initialize on app load
if (typeof window !== 'undefined') {
  initializePatientManagement()
}
```

**For Server-Side (API Routes):**

```typescript
// app/api/patients/route.ts
import { getPatientManagementServer } from '@/lib/patient-management'

export async function GET() {
  const patientManagement = await getPatientManagementServer()
  // Use patientManagement...
}
```

## Client-Side Integration

### Using React Hooks

The easiest way to use the patient management system in React components:

```typescript
'use client'

import { usePatientOperations } from '@/lib/patient-management'

export function PatientList() {
  const { searchPatients } = usePatientOperations()
  
  const handleSearch = async () => {
    const results = await searchPatients({
      searchTerm: 'John',
      page: 1,
      pageSize: 10
    })
    console.log(results)
  }
  
  return <button onClick={handleSearch}>Search</button>
}
```

### Available Hooks

- `usePatientManagement()` - Main hook for accessing the facade
- `usePatientOperations()` - Patient CRUD operations
- `useMedicalRecordOperations()` - Medical record operations
- `useDocumentOperations()` - Document management
- `useStatusOperations()` - Status tracking

### Using the Facade Directly

```typescript
'use client'

import { getPatientManagement } from '@/lib/patient-management'

const patientManagement = getPatientManagement()

// Register a new patient
const patient = await patientManagement.registerPatient({
  fullName: 'John Doe',
  dateOfBirth: new Date('1990-01-01'),
  // ... other fields
})

// Search patients
const results = await patientManagement.searchPatients({
  searchTerm: 'John',
  page: 1,
  pageSize: 10
})
```

## Server-Side Integration

### API Routes (Next.js App Router)

```typescript
// app/api/patients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPatientManagementServer } from '@/lib/patient-management'

export async function GET(request: NextRequest) {
  try {
    const patientManagement = await getPatientManagementServer()
    
    const searchParams = request.nextUrl.searchParams
    const searchTerm = searchParams.get('search') || ''
    
    const results = await patientManagement.searchPatients({
      searchTerm,
      page: 1,
      pageSize: 20
    })
    
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to search patients' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const patientManagement = await getPatientManagementServer()
    const body = await request.json()
    
    const patient = await patientManagement.registerPatient(body)
    
    return NextResponse.json(patient, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    )
  }
}
```

### Server Components

```typescript
// app/patients/[id]/page.tsx
import { getPatientManagementServer } from '@/lib/patient-management'

export default async function PatientPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const patientManagement = await getPatientManagementServer()
  const patient = await patientManagement.getPatient(params.id)
  
  if (!patient) {
    return <div>Patient not found</div>
  }
  
  return (
    <div>
      <h1>{patient.personalInfo.fullName.value}</h1>
      {/* Render patient details */}
    </div>
  )
}
```

## API Route Integration

### Using Existing API Handlers

The system provides pre-built API handlers that you can use:

```typescript
// app/api/patient-management/patients/route.ts
import { handlePatientRequest } from '@/lib/patient-management/infrastructure/api'

export const GET = handlePatientRequest
export const POST = handlePatientRequest
```

### Custom API Routes

```typescript
// app/api/custom/patients/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPatientManagementServer } from '@/lib/patient-management'

export async function POST(request: NextRequest) {
  const patientManagement = await getPatientManagementServer()
  const criteria = await request.json()
  
  // Use advanced search
  const results = await patientManagement.advancedSearch(criteria)
  
  return NextResponse.json(results)
}
```

## React Component Integration

### Patient Registration Form

```typescript
'use client'

import { usePatientOperations } from '@/lib/patient-management'
import { useState } from 'react'

export function PatientRegistrationForm() {
  const { registerPatient } = usePatientOperations()
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    // ... other fields
  })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const patient = await registerPatient(formData)
      console.log('Patient registered:', patient)
      // Handle success
    } catch (error) {
      console.error('Registration failed:', error)
      // Handle error
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

### Patient Search Component

```typescript
'use client'

import { usePatientOperations } from '@/lib/patient-management'
import { useState, useEffect } from 'react'

export function PatientSearch() {
  const { searchPatients } = usePatientOperations()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  
  useEffect(() => {
    const search = async () => {
      if (searchTerm.length > 2) {
        const data = await searchPatients({
          searchTerm,
          page: 1,
          pageSize: 10
        })
        setResults(data.items)
      }
    }
    
    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm, searchPatients])
  
  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search patients..."
      />
      <ul>
        {results.map((patient) => (
          <li key={patient.id.value}>{patient.personalInfo.fullName.value}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Medical Record Management

```typescript
'use client'

import { useMedicalRecordOperations } from '@/lib/patient-management'

export function MedicalRecordForm({ patientId }: { patientId: string }) {
  const { createMedicalRecord, getMedicalHistory } = useMedicalRecordOperations()
  
  const handleCreateRecord = async (recordData: any) => {
    const record = await createMedicalRecord(patientId, recordData)
    console.log('Record created:', record)
  }
  
  const handleLoadHistory = async () => {
    const history = await getMedicalHistory(patientId)
    console.log('Medical history:', history)
  }
  
  return (
    <div>
      {/* Medical record form */}
    </div>
  )
}
```

## Advanced Usage

### Direct Container Access

For advanced scenarios, you can access the container directly:

```typescript
import { PatientManagementContainer } from '@/lib/patient-management'

const container = PatientManagementContainer.getInstance()

// Access individual services
const patientRegistry = container.patientRegistry
const auditLogger = container.auditLogger
const lgpdEngine = container.lgpdComplianceEngine

// Get service bundles
const coreServices = container.getCoreServices()
const complianceServices = container.getComplianceServices()
```

### Custom Service Configuration

```typescript
import { PatientManagementContainer } from '@/lib/patient-management'
import { createClient } from '@/lib/supabase/client'

const container = PatientManagementContainer.initialize({
  supabaseClient: createClient(),
  encryptionKey: 'custom-key',
  enableAuditLogging: true,
  enableSecurityMonitoring: false
})
```

### Health Checks

```typescript
import { getPatientManagement } from '@/lib/patient-management'

const patientManagement = getPatientManagement()
const health = await patientManagement.healthCheck()

console.log('System healthy:', health.healthy)
console.log('Service status:', health.services)
```

### Integration Status

```typescript
const status = await patientManagement.getIntegrationStatus()

console.log('Appointment integration:', status.appointment)
console.log('Report integration:', status.report)
```

## Best Practices

1. **Initialize Once**: Initialize the system once at application startup
2. **Use Hooks in Components**: Prefer React hooks for component integration
3. **Server-Side Isolation**: Always use `getPatientManagementServer()` in API routes
4. **Error Handling**: Always wrap operations in try-catch blocks
5. **Type Safety**: Use TypeScript types exported from the module
6. **Audit Logging**: All operations are automatically logged
7. **LGPD Compliance**: Consent and access checks are built-in

## Troubleshooting

### "Patient Management System not initialized"

Make sure you call `initializePatientManagement()` before using the system:

```typescript
// In your root layout or providers
import { initializePatientManagement } from '@/lib/patient-management'

if (typeof window !== 'undefined') {
  initializePatientManagement()
}
```

### Type Errors

Import types from the module:

```typescript
import type { Patient, CreatePatientData } from '@/lib/patient-management'
```

### Server vs Client

- Use `getPatientManagement()` on the client
- Use `getPatientManagementServer()` on the server
- Never mix client and server initialization

## Examples

See the `examples` directory for complete working examples:

- `examples/patient-registry-usage.ts` - Patient CRUD operations
- `examples/medical-record-manager-usage.ts` - Medical records
- `examples/document-manager-usage.ts` - Document management
- `examples/integration-hub-usage.ts` - System integrations
- `examples/advanced-search-usage.ts` - Advanced search features

## Support

For issues or questions, refer to:
- API Documentation: `docs/API_REFERENCE.md`
- Component Specs: `docs/COMPONENT_SPECS.md`
- Technical Specs: `docs/TECHNICAL_SPECS.md`
