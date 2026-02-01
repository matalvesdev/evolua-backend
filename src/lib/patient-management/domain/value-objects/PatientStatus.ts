// ============================================================================
// PATIENT STATUS VALUE OBJECT
// Represents patient status throughout treatment lifecycle
// ============================================================================

export type PatientStatusType = 'new' | 'active' | 'on_hold' | 'discharged' | 'inactive'

// Status constants for easy reference
export const PatientStatusValues = {
  NEW: 'new' as PatientStatusType,
  ACTIVE: 'active' as PatientStatusType,
  ON_HOLD: 'on_hold' as PatientStatusType,
  DISCHARGED: 'discharged' as PatientStatusType,
  INACTIVE: 'inactive' as PatientStatusType
} as const

export class PatientStatus {
  constructor(public readonly value: PatientStatusType) {
    const validStatuses: PatientStatusType[] = ['new', 'active', 'on_hold', 'discharged', 'inactive']
    
    if (!validStatuses.includes(value)) {
      throw new Error(`Invalid patient status: ${value}. Must be one of: ${validStatuses.join(', ')}`)
    }
  }

  isActive(): boolean {
    return this.value === 'active'
  }

  canScheduleAppointment(): boolean {
    return this.value === 'active' || this.value === 'new'
  }

  isNew(): boolean {
    return this.value === 'new'
  }

  isOnHold(): boolean {
    return this.value === 'on_hold'
  }

  isDischarged(): boolean {
    return this.value === 'discharged'
  }

  isInactive(): boolean {
    return this.value === 'inactive'
  }

  getDisplayName(): string {
    const displayNames: Record<PatientStatusType, string> = {
      'new': 'Novo',
      'active': 'Ativo',
      'on_hold': 'Em Espera',
      'discharged': 'Alta',
      'inactive': 'Inativo'
    }
    
    return displayNames[this.value]
  }

  getColor(): string {
    const colors: Record<PatientStatusType, string> = {
      'new': 'blue',
      'active': 'green',
      'on_hold': 'yellow',
      'discharged': 'gray',
      'inactive': 'red'
    }
    
    return colors[this.value]
  }

  equals(other: PatientStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}