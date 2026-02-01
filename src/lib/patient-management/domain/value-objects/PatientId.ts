// ============================================================================
// PATIENT ID VALUE OBJECT
// Unique identifier for patients
// ============================================================================

export class PatientId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Patient ID cannot be empty')
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(value)) {
      throw new Error('Patient ID must be a valid UUID')
    }
  }

  equals(other: PatientId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  static generate(): PatientId {
    // Generate a new UUID v4
    return new PatientId(crypto.randomUUID())
  }
}