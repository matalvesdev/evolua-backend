# Patient Management UI Components

This directory contains React components for managing patient medical records in the Evolua CRM platform.

## Components

### 1. Medical History Input Form (`medical-history-input-form.tsx`)

A comprehensive form for entering and managing patient medical history including:

- **Diagnoses**: Add multiple diagnoses with ICD-10 codes, descriptions, severity levels, and diagnosis dates
- **Medications**: Track current and past medications with dosage, frequency, prescriber, and date ranges
- **Allergies**: Document patient allergies with allergen, reaction, severity, and diagnosis date

**Features:**
- Dynamic form fields - add/remove entries as needed
- Inline validation with error messages
- Organized card-based layout for each entry type
- Support for optional notes and metadata

**Usage:**
```tsx
import { MedicalHistoryInputForm } from "@/components/patient-management"

<MedicalHistoryInputForm
  initialData={existingHistory}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  isLoading={isSubmitting}
  error={errorMessage}
/>
```

### 2. Document Upload Manager (`document-upload-manager.tsx`)

A full-featured document management interface for patient files:

- **File Upload**: Drag-and-drop or click-to-select file upload
- **Document Metadata**: Title, type, description, tags, and confidentiality settings
- **Document List**: View all uploaded documents with status indicators
- **Actions**: View, download, and delete documents

**Supported Document Types:**
- Medical reports
- Prescriptions
- Exam results
- Insurance cards
- Identification documents
- Consent forms
- Treatment plans
- Progress notes
- Other documents

**Features:**
- File type validation (PDF, DOC, DOCX, images, TXT)
- File size display and validation (max 50MB)
- Document status tracking (uploading, processing, validated, failed, archived)
- Confidential document marking
- Tag-based organization
- Visual file type icons

**Usage:**
```tsx
import { DocumentUploadManager } from "@/components/patient-management"

<DocumentUploadManager
  documents={patientDocuments}
  onUpload={handleUpload}
  onDelete={handleDelete}
  onDownload={handleDownload}
  onView={handleView}
  isLoading={isProcessing}
  error={errorMessage}
/>
```

### 3. Treatment Timeline (`treatment-timeline.tsx`)

A chronological visualization of patient treatment history:

- **Event Types**: Diagnoses, medications, allergies, assessments, progress notes, treatment plans
- **Chronological Display**: Events grouped by month/year
- **Visual Indicators**: Color-coded icons for different event types
- **Severity Badges**: Visual severity indicators for relevant events
- **Metadata Display**: Additional event details and context

**Features:**
- Automatic chronological sorting (most recent first)
- Month/year grouping for better organization
- Interactive event cards (optional click handlers)
- Color-coded event types with legend
- Responsive timeline layout
- Empty state handling

**Usage:**
```tsx
import { TreatmentTimeline } from "@/components/patient-management"

<TreatmentTimeline
  events={timelineEvents}
  patientName="Patient Name"
  onEventClick={handleEventClick}
/>
```

### 4. Example Integration (`medical-record-management-example.tsx`)

A complete example showing how to integrate all three components together with:

- Tab-based navigation between components
- State management for medical history, documents, and timeline
- Event handlers for all component actions
- Timeline synchronization (events added when history/documents are updated)
- Summary statistics display

## Data Types

### Medical History Types

```typescript
interface DiagnosisFormData {
  code: string
  description: string
  diagnosedAt: string
  severity: "mild" | "moderate" | "severe" | "unknown"
}

interface MedicationFormData {
  name: string
  dosage: string
  frequency: string
  startDate: string
  endDate?: string
  prescribedBy: string
  notes?: string
}

interface AllergyFormData {
  allergen: string
  reaction: string
  severity: "mild" | "moderate" | "severe" | "life_threatening"
  diagnosedAt: string
  notes?: string
}
```

### Document Types

```typescript
type DocumentType =
  | "medical_report"
  | "prescription"
  | "exam_result"
  | "insurance_card"
  | "identification"
  | "consent_form"
  | "treatment_plan"
  | "progress_note"
  | "other"

type DocumentStatus = 
  | "uploading" 
  | "processing" 
  | "validated" 
  | "failed_validation" 
  | "archived"

interface DocumentMetadata {
  title: string
  description?: string
  documentType: DocumentType
  tags?: string[]
  isConfidential: boolean
}
```

### Timeline Types

```typescript
interface TimelineEvent {
  id: string
  date: Date
  type: "diagnosis" | "medication" | "allergy" | "assessment" | "progress_note" | "treatment_plan"
  title: string
  description: string
  severity?: "mild" | "moderate" | "severe" | "life_threatening" | "unknown"
  metadata?: Record<string, string | number | boolean>
}
```

## Integration with Backend

These components are designed to work with the patient management domain services:

- **MedicalRecordManager**: For medical history operations
- **DocumentManager**: For document upload and management
- **MedicalRecord Repository**: For timeline data retrieval

See the domain layer documentation in `frontend/src/lib/patient-management/` for more details.

## Styling

All components use:
- Tailwind CSS for styling
- shadcn/ui components (Card, Button, Input, Textarea, Label)
- Lucide React icons
- Consistent purple accent color (#7C3AED) matching the Evolua brand

## Validation

- Client-side validation with inline error messages
- Required field indicators (*)
- Format validation for dates and text fields
- File type and size validation for documents

## Accessibility

- Semantic HTML structure
- Proper label associations
- Keyboard navigation support
- ARIA attributes where appropriate
- Focus management

### 5. Status Transition Dialog (`status-transition-dialog.tsx`)

A modal dialog for changing patient status with validation:

- **Status Selection**: Dropdown showing only allowed status transitions
- **Reason Input**: Optional or required reason field based on transition rules
- **Validation**: Enforces status transition rules and required fields
- **Visual Feedback**: Color-coded status indicators and icons

**Features:**
- Automatic validation of allowed transitions
- Conditional reason requirement based on transition type
- Current status display
- Error handling and display
- Loading states during submission

**Usage:**
```tsx
import { StatusTransitionDialog } from "@/components/patient-management"

<StatusTransitionDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  currentStatus="active"
  patientName="Maria Silva"
  patientId="patient-123"
  onStatusChange={handleStatusChange}
/>
```

### 6. Patient Status Dashboard (`patient-status-dashboard.tsx`)

A comprehensive dashboard for monitoring patient status distribution and transitions:

- **Status Overview Cards**: Visual cards showing count and percentage for each status
- **Recent Transitions**: Timeline of recent status changes
- **Statistics**: Average time in each status
- **Interactive**: Click on status cards to filter patients

**Features:**
- Real-time status distribution visualization
- Color-coded status indicators
- Recent transition history with timestamps
- Average time in status metrics
- Clickable cards for filtering
- Empty state handling

**Usage:**
```tsx
import { PatientStatusDashboard } from "@/components/patient-management"

<PatientStatusDashboard
  statistics={statusStatistics}
  onStatusClick={handleStatusFilter}
  onTransitionClick={handleTransitionView}
/>
```

### 7. Status Filter Bar (`status-filter-bar.tsx`)

A filtering interface for searching and filtering patients by status:

- **Status Filters**: Toggle buttons for each status type
- **Search Bar**: Text search for patient information
- **Active Filter Display**: Shows currently active filters
- **Clear Filters**: Quick action to reset all filters

**Features:**
- Multi-select status filtering
- Patient count badges on each filter
- Visual indication of active filters
- Search integration
- Responsive layout
- Clear filters action

**Usage:**
```tsx
import { StatusFilterBar } from "@/components/patient-management"

<StatusFilterBar
  statusCounts={statusCounts}
  selectedStatuses={selectedStatuses}
  onStatusToggle={handleStatusToggle}
  onClearFilters={handleClearFilters}
  showSearch={true}
  searchValue={searchValue}
  onSearchChange={setSearchValue}
/>
```

### 8. Status Management Example (`status-management-example.tsx`)

A complete example demonstrating the integration of all status management components:

- Status dashboard with statistics
- Status filter bar for patient list
- Status transition dialog for changing patient status
- Mock data and handlers for demonstration

## Data Types

### Status Management Types

```typescript
type PatientStatusType = 'new' | 'active' | 'on_hold' | 'discharged' | 'inactive'

interface StatusStatistics {
  totalPatients: number
  statusCounts: Record<PatientStatusType, number>
  recentTransitions: StatusTransitionItem[]
  averageTimeInStatus?: Record<PatientStatusType, number>
}

interface StatusTransitionItem {
  id: string
  patientName: string
  patientId: string
  fromStatus: PatientStatusType | null
  toStatus: PatientStatusType
  reason?: string
  timestamp: Date
  changedByName: string
}
```

### Medical History Types

To fully integrate these components:

1. Connect to actual backend APIs
2. Implement authentication and authorization
3. Add LGPD compliance features (consent tracking, data encryption)
4. Implement real-time updates
5. Add search and filtering capabilities
6. Integrate with appointment and report systems


## Status Management Components

The status management components (StatusTransitionDialog, PatientStatusDashboard, StatusFilterBar) provide a complete solution for:

- **Status Lifecycle Management**: Track patients through their treatment journey (New → Active → On Hold → Discharged/Inactive)
- **Status Transition Validation**: Enforce business rules for allowed status changes
- **Status Monitoring**: Dashboard view of status distribution and recent changes
- **Status-Based Filtering**: Filter patient lists by one or more status types

### Status Transition Rules

The system enforces the following status transition rules:

- **From New**: Can transition to Active or Inactive
- **From Active**: Can transition to On Hold, Discharged, or Inactive (requires reason)
- **From On Hold**: Can transition to Active, Discharged, or Inactive
- **From Discharged**: Can transition to Active (readmission) or Inactive
- **From Inactive**: Can transition to Active (reactivation, requires reason)

### Integration with StatusTracker Service

These components are designed to work with the `StatusTracker` service from the domain layer:

```typescript
import { StatusTracker } from "@/lib/patient-management/application/services/StatusTracker"

// Change patient status
await statusTracker.changePatientStatus({
  patientId: new PatientId(patientId),
  newStatus: 'active',
  reason: 'Patient ready to begin treatment',
  userId: new UserId(currentUserId)
})

// Get status statistics
const statistics = await statusTracker.getStatusStatistics()

// Get patients by status
const activePatients = await statusTracker.getPatientsByStatus('active')
```

## Requirements Fulfilled

This implementation satisfies the following requirements from the spec:

- **Requirement 2.1**: Medical history recording with diagnosis, treatment history, medications
- **Requirement 2.2**: Document upload with validation and security
- **Requirement 2.6**: Chronological treatment timeline with progress notes
- **Requirement 3.1**: Patient status initialization and tracking
- **Requirement 3.2**: Status transition validation and timestamps
- **Requirement 7.2**: Status-based filtering capabilities
