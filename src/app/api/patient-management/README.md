# Patient Management API

This directory contains REST API endpoints for the Patient Management System, implementing comprehensive CRUD operations, search functionality, and document management with full security and audit logging.

## Overview

The Patient Management API provides secure, LGPD-compliant endpoints for managing patient data, medical records, and documents. All endpoints include:

- **Authentication & Authorization**: User identity verification and permission checks
- **Request/Response Logging**: Complete audit trail for compliance
- **Rate Limiting**: Protection against abuse
- **Security Headers**: Defense against common web vulnerabilities
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Standardized error responses

## Requirements Implemented

- **1.1**: Patient Registration and Profile Management
- **1.4**: Universal Access Logging
- **2.1**: Medical History and Documentation Management
- **2.2**: Document Management with Security
- **5.2**: LGPD Compliance - Authorization and Access Control
- **7.1**: Search and Filtering Capabilities
- **8.1**: Audit Trail and Activity Logging

## API Endpoints

### Patient Operations

#### List/Search Patients
```
GET /api/patient-management/patients
```

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `query` (string): Search query (searches name, email, phone, CPF)
- `status` (string): Filter by status (new, active, on_hold, discharged, inactive)
- `minAge` (number): Minimum age filter
- `maxAge` (number): Maximum age filter
- `createdAfter` (ISO date): Filter by creation date
- `createdBefore` (ISO date): Filter by creation date
- `sortBy` (string): Sort field (name, createdAt, updatedAt, status)
- `sortOrder` (string): Sort order (asc, desc)

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "personalInfo": {
        "fullName": "string",
        "dateOfBirth": "ISO date",
        "age": number,
        "gender": "string",
        "cpf": "string",
        "rg": "string"
      },
      "contactInfo": { ... },
      "emergencyContact": { ... },
      "insuranceInfo": { ... },
      "status": "string",
      "isActive": boolean,
      "canScheduleAppointment": boolean,
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ],
  "pagination": {
    "total": number,
    "page": number,
    "limit": number,
    "totalPages": number,
    "hasNext": boolean,
    "hasPrevious": boolean
  }
}
```

#### Create Patient
```
POST /api/patient-management/patients
```

Request Body:
```json
{
  "personalInfo": {
    "fullName": "string",
    "dateOfBirth": "ISO date",
    "gender": "string",
    "cpf": "string",
    "rg": "string"
  },
  "contactInfo": {
    "primaryPhone": "string",
    "secondaryPhone": "string (optional)",
    "email": "string (optional)",
    "address": {
      "street": "string",
      "number": "string",
      "complement": "string (optional)",
      "neighborhood": "string",
      "city": "string",
      "state": "string",
      "zipCode": "string",
      "country": "string (optional)"
    }
  },
  "emergencyContact": {
    "name": "string",
    "relationship": "string",
    "phone": "string",
    "email": "string (optional)"
  },
  "insuranceInfo": {
    "provider": "string (optional)",
    "policyNumber": "string (optional)",
    "groupNumber": "string (optional)",
    "validUntil": "ISO date (optional)"
  }
}
```

Response: Patient object (201 Created)

#### Get Patient
```
GET /api/patient-management/patients/{id}
```

Response: Patient object (200 OK)

#### Update Patient
```
PATCH /api/patient-management/patients/{id}
```

Request Body: Partial patient object (any fields can be updated)

Response: Updated patient object (200 OK)

#### Delete Patient
```
DELETE /api/patient-management/patients/{id}
```

Response: Success message (200 OK)

### Medical Record Operations

#### List Medical Records
```
GET /api/patient-management/medical-records?patientId={uuid}
```

Query Parameters:
- `patientId` (required): Patient UUID

Response: Array of medical record objects (200 OK)

#### Create Medical Record
```
POST /api/patient-management/medical-records
```

Request Body:
```json
{
  "patientId": "uuid",
  "diagnosis": [
    {
      "code": "string",
      "description": "string",
      "diagnosedAt": "ISO date",
      "severity": "mild|moderate|severe|unknown"
    }
  ],
  "medications": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string",
      "startDate": "ISO date",
      "endDate": "ISO date (optional)",
      "prescribedBy": "string",
      "notes": "string (optional)"
    }
  ],
  "allergies": [
    {
      "allergen": "string",
      "reaction": "string",
      "severity": "mild|moderate|severe|life_threatening",
      "diagnosedAt": "ISO date",
      "notes": "string (optional)"
    }
  ],
  "initialAssessment": {
    "type": "string",
    "findings": "string",
    "recommendations": ["string"],
    "assessedBy": "string",
    "date": "ISO date",
    "results": {}
  }
}
```

Response: Medical record object (201 Created)

#### Get Medical Record
```
GET /api/patient-management/medical-records/{id}
```

Response: Medical record object (200 OK)

#### Update Medical Record
```
PATCH /api/patient-management/medical-records/{id}
```

Request Body: Partial medical record object

Response: Updated medical record object (200 OK)

#### Add Progress Note
```
POST /api/patient-management/medical-records/{id}/progress-notes
```

Request Body:
```json
{
  "content": "string",
  "sessionDate": "ISO date",
  "category": "assessment|treatment|observation|goal_progress"
}
```

Response: Success message (201 Created)

### Document Operations

#### List/Search Documents
```
GET /api/patient-management/documents
```

Query Parameters:
- `patientId` (uuid): Filter by patient
- `page` (number): Page number
- `limit` (number): Items per page
- `documentType` (string): Filter by document type
- `status` (string): Filter by status
- `query` (string): Search query

Response: Paginated document list (200 OK)

#### Upload Document
```
POST /api/patient-management/documents
```

Content-Type: multipart/form-data

Form Fields:
- `file` (File): Document file
- `patientId` (string): Patient UUID
- `title` (string): Document title
- `description` (string, optional): Document description
- `documentType` (string): Document type
- `tags` (JSON array, optional): Document tags
- `isConfidential` (boolean): Confidentiality flag
- `retentionPeriod` (number, optional): Retention period in days
- `legalBasis` (string, optional): Legal basis for storage

Response: Document object (201 Created)

#### Get Document
```
GET /api/patient-management/documents/{id}
```

Response: Document metadata (200 OK)

#### Update Document
```
PATCH /api/patient-management/documents/{id}
```

Request Body:
```json
{
  "metadata": {
    "title": "string (optional)",
    "description": "string (optional)",
    "tags": ["string"] (optional)
  },
  "status": "string (optional)"
}
```

Response: Updated document object (200 OK)

#### Delete Document
```
DELETE /api/patient-management/documents/{id}
```

Response: Success message (200 OK)

#### Download Document
```
GET /api/patient-management/documents/{id}/download
```

Response: File blob with appropriate headers (200 OK)

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error codes:
- `AUTH_REQUIRED` (401): Authentication required
- `UNAUTHORIZED` (401): Invalid credentials
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input data
- `VALIDATION_FAILED` (400): Validation failed
- `DUPLICATE_PATIENT` (409): Duplicate patient detected
- `CONFLICT` (409): Resource conflict
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Security Features

### Authentication
All endpoints require valid Supabase authentication. Include the session token in requests.

### Authorization
Endpoints check user permissions before allowing access to patient data.

### Rate Limiting
Default rate limits:
- 100 requests per minute per user
- Configurable per endpoint

### Security Headers
All responses include:
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security

### Audit Logging
All requests are logged to `api_request_logs` table with:
- Request ID
- User information
- Timestamp
- Duration
- Status code
- IP address
- User agent

## LGPD Compliance

The API ensures LGPD compliance through:

1. **Access Logging**: All patient data access is logged
2. **Authorization**: User permissions verified before data access
3. **Audit Trail**: 7-year retention of access logs
4. **Data Encryption**: Sensitive data encrypted at rest and in transit
5. **Security Monitoring**: Automated detection of suspicious activity

## Usage Examples

### JavaScript/TypeScript

```typescript
// List patients
const response = await fetch('/api/patient-management/patients?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
const { data, pagination } = await response.json()

// Create patient
const newPatient = await fetch('/api/patient-management/patients', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    personalInfo: { ... },
    contactInfo: { ... },
    emergencyContact: { ... }
  })
})

// Upload document
const formData = new FormData()
formData.append('file', file)
formData.append('patientId', patientId)
formData.append('title', 'Medical Report')
formData.append('documentType', 'medical_report')
formData.append('isConfidential', 'true')

const document = await fetch('/api/patient-management/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
```

## Testing

Use the provided middleware and handler utilities for consistent testing:

```typescript
import { createProtectedApiHandler, successResponse } from '@/lib/patient-management/infrastructure/api'

export const GET = createProtectedApiHandler(
  async (request, context) => {
    // Test your logic here
    return successResponse({ test: 'data' })
  }
)
```

## Monitoring

View API logs and statistics:

```sql
-- Recent requests
SELECT * FROM api_request_logs
ORDER BY timestamp DESC
LIMIT 100;

-- Usage statistics
SELECT * FROM api_usage_statistics
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Security alerts
SELECT * FROM api_security_alerts
WHERE timestamp >= NOW() - INTERVAL '24 hours';
```

## Support

For issues or questions about the API:
1. Check the middleware README: `/lib/patient-management/infrastructure/api/README.md`
2. Review the design document: `.kiro/specs/patient-management-system/design.md`
3. Check API logs for error details
