// ============================================================================
// MEDICAL RECORD ID VALUE OBJECT
// Unique identifier for medical records
// ============================================================================

export class MedicalRecordId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Medical Record ID cannot be empty')
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(value)) {
      throw new Error('Medical Record ID must be a valid UUID')
    }
  }

  equals(other: MedicalRecordId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  static generate(): MedicalRecordId {
    return new MedicalRecordId(crypto.randomUUID())
  }
}