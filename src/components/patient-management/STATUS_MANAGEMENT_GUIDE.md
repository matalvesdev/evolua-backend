# Status Management UI Components - Usage Guide

This guide explains how to use the status management UI components in the Patient Management System.

## Overview

The status management system consists of three main components that work together to provide a complete status lifecycle management solution:

1. **StatusTransitionDialog** - Modal for changing patient status
2. **PatientStatusDashboard** - Dashboard showing status statistics and recent transitions
3. **StatusFilterBar** - Filter bar for searching and filtering patients by status

## Quick Start

### 1. Status Transition Dialog

Use this component to allow users to change a patient's status with proper validation.

```tsx
import { StatusTransitionDialog } from "@/components/patient-management"
import { useState } from "react"

function PatientProfile() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const handleStatusChange = async (newStatus, reason) => {
    // Call your API or service
    await statusTracker.changePatientStatus({
      patientId: new PatientId(patient.id),
      newStatus,
      reason,
      userId: new UserId(currentUser.id)
    })
    
    // Refresh patient data
    await refetchPatient()
  }
  
  return (
    <>
      <button onClick={() => setIsDialogOpen(true)}>
        Change Status
      </button>
      
      <StatusTransitionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        currentStatus={patient.status}
        patientName={patient.name}
        patientId={patient.id}
        onStatusChange={handleStatusChange}
      />
    </>
  )
}
```

### 2. Patient Status Dashboard

Display status statistics and recent transitions on a dashboard page.

```tsx
import { PatientStatusDashboard } from "@/components/patient-management"
import { useEffect, useState } from "react"

function StatusDashboardPage() {
  const [statistics, setStatistics] = useState(null)
  
  useEffect(() => {
    // Fetch statistics from your API
    const fetchStats = async () => {
      const stats = await statusTracker.getStatusStatistics()
      setStatistics(stats)
    }
    fetchStats()
  }, [])
  
  const handleStatusClick = (status) => {
    // Navigate to filtered patient list
    router.push(`/patients?status=${status}`)
  }
  
  const handleTransitionClick = (transition) => {
    // Navigate to patient profile
    router.push(`/patients/${transition.patientId}`)
  }
  
  if (!statistics) return <div>Loading...</div>
  
  return (
    <PatientStatusDashboard
      statistics={statistics}
      onStatusClick={handleStatusClick}
      onTransitionClick={handleTransitionClick}
    />
  )
}
```

### 3. Status Filter Bar

Add filtering capabilities to your patient list page.

```tsx
import { StatusFilterBar } from "@/components/patient-management"
import { useState, useEffect } from "react"

function PatientListPage() {
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [searchValue, setSearchValue] = useState("")
  const [patients, setPatients] = useState([])
  const [statusCounts, setStatusCounts] = useState({
    new: 0,
    active: 0,
    on_hold: 0,
    discharged: 0,
    inactive: 0,
  })
  
  useEffect(() => {
    // Fetch patients based on filters
    const fetchPatients = async () => {
      const result = await patientRepository.search({
        statuses: selectedStatuses,
        searchTerm: searchValue,
      })
      setPatients(result.data)
    }
    fetchPatients()
  }, [selectedStatuses, searchValue])
  
  const handleStatusToggle = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }
  
  const handleClearFilters = () => {
    setSelectedStatuses([])
    setSearchValue("")
  }
  
  return (
    <div>
      <StatusFilterBar
        statusCounts={statusCounts}
        selectedStatuses={selectedStatuses}
        onStatusToggle={handleStatusToggle}
        onClearFilters={handleClearFilters}
        showSearch={true}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
      
      <PatientList patients={patients} />
    </div>
  )
}
```

## Status Transition Rules

The system enforces the following business rules for status transitions:

### Allowed Transitions

| From Status | To Status | Requires Reason |
|------------|-----------|-----------------|
| New | Active | No |
| New | Inactive | Yes |
| Active | On Hold | Yes |
| Active | Discharged | Yes |
| Active | Inactive | Yes |
| On Hold | Active | No |
| On Hold | Discharged | Yes |
| On Hold | Inactive | Yes |
| Discharged | Active | Yes |
| Discharged | Inactive | No |
| Inactive | Active | Yes |

### Status Descriptions

- **New**: Newly registered patients who haven't started treatment yet
- **Active**: Patients currently receiving treatment
- **On Hold**: Patients whose treatment is temporarily suspended
- **Discharged**: Patients who have completed their treatment successfully
- **Inactive**: Patients who are no longer receiving treatment

## Integration with Backend Services

These components are designed to work with the `StatusTracker` service:

```typescript
import { StatusTracker } from "@/lib/patient-management/application/services/StatusTracker"
import { PatientId } from "@/lib/patient-management/domain/value-objects/PatientId"
import { UserId } from "@/lib/patient-management/domain/value-objects/UserId"

// Initialize the service
const statusTracker = new StatusTracker(
  patientRepository,
  statusHistoryRepository
)

// Change patient status
await statusTracker.changePatientStatus({
  patientId: new PatientId("patient-123"),
  newStatus: "active",
  reason: "Patient ready to begin treatment",
  userId: new UserId("user-456")
})

// Get status statistics
const statistics = await statusTracker.getStatusStatistics()

// Get patients by status
const activePatients = await statusTracker.getPatientsByStatus("active")

// Get status history
const history = await statusTracker.getPatientStatusHistory(
  new PatientId("patient-123")
)
```

## Data Types

### StatusStatistics

```typescript
interface StatusStatistics {
  totalPatients: number
  statusCounts: Record<PatientStatusType, number>
  recentTransitions: StatusTransitionItem[]
  averageTimeInStatus?: Record<PatientStatusType, number>
}
```

### StatusTransitionItem

```typescript
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

### PatientStatusType

```typescript
type PatientStatusType = 'new' | 'active' | 'on_hold' | 'discharged' | 'inactive'
```

## Best Practices

1. **Always validate transitions**: Use the `StatusTracker.validateStatusTransition()` method before attempting status changes
2. **Provide reasons**: Even when not required, providing a reason helps with audit trails
3. **Handle errors gracefully**: Status changes can fail due to validation or system errors
4. **Refresh data**: After status changes, refresh patient data and statistics
5. **Use optimistic updates**: Show loading states during status changes
6. **Log all changes**: All status changes are automatically logged in the audit trail

## Example: Complete Integration

See `status-management-example.tsx` for a complete working example that demonstrates:

- Status dashboard with statistics
- Status filter bar for patient list
- Status transition dialog
- State management
- Error handling
- Mock data for testing

## Styling

All components use:
- Tailwind CSS for styling
- shadcn/ui components
- Material Symbols icons
- Consistent color scheme:
  - New: Blue
  - Active: Green
  - On Hold: Yellow
  - Discharged: Gray
  - Inactive: Red

## Accessibility

- Keyboard navigation support
- ARIA labels and descriptions
- Focus management in dialogs
- Screen reader friendly
- Color contrast compliance

## Requirements Fulfilled

These components fulfill the following requirements:

- **Requirement 3.1**: Patient status initialization and tracking
- **Requirement 3.2**: Status transition validation and timestamps
- **Requirement 3.5**: Status-based patient filtering
- **Requirement 3.6**: Status history maintenance
- **Requirement 7.2**: Multi-criteria filtering with status

## Support

For issues or questions about these components, refer to:
- Main README: `frontend/src/components/patient-management/README.md`
- Domain documentation: `frontend/src/lib/patient-management/`
- Design document: `.kiro/specs/patient-management-system/design.md`
