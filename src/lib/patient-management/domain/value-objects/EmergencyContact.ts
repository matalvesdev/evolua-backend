// ============================================================================
// EMERGENCY CONTACT VALUE OBJECT
// Emergency contact information with validation
// ============================================================================

import { FullName } from './FullName'
import { PhoneNumber } from './PhoneNumber'

export class EmergencyContact {
  constructor(
    public readonly name: FullName,
    public readonly phone: PhoneNumber,
    public readonly relationship: string
  ) {
    if (!relationship || relationship.trim().length === 0) {
      throw new Error('Emergency contact relationship cannot be empty')
    }

    if (relationship.trim().length > 50) {
      throw new Error('Emergency contact relationship cannot exceed 50 characters')
    }
  }

  equals(other: EmergencyContact): boolean {
    return (
      this.name.equals(other.name) &&
      this.phone.equals(other.phone) &&
      this.relationship === other.relationship
    )
  }

  toString(): string {
    return `${this.name.value} (${this.relationship}) - ${this.phone.value}`
  }
}