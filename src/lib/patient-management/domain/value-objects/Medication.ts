// ============================================================================
// MEDICATION VALUE OBJECT
// Patient medication with validation
// ============================================================================

export class Medication {
  constructor(
    public readonly name: string,
    public readonly dosage: string,
    public readonly frequency: string,
    public readonly startDate: Date,
    public readonly endDate: Date | null,
    public readonly prescribedBy: string,
    public readonly notes: string | null
  ) {
    if (!name || name.trim().length === 0) {
      throw new Error('Medication name cannot be empty')
    }

    if (!dosage || dosage.trim().length === 0) {
      throw new Error('Medication dosage cannot be empty')
    }

    if (!frequency || frequency.trim().length === 0) {
      throw new Error('Medication frequency cannot be empty')
    }

    if (!prescribedBy || prescribedBy.trim().length === 0) {
      throw new Error('Prescribing doctor cannot be empty')
    }

    if (startDate > new Date()) {
      throw new Error('Medication start date cannot be in the future')
    }

    if (endDate && endDate < startDate) {
      throw new Error('Medication end date cannot be before start date')
    }

    if (notes && notes.length > 500) {
      throw new Error('Medication notes cannot exceed 500 characters')
    }
  }

  isActive(): boolean {
    return this.endDate === null || this.endDate > new Date()
  }

  equals(other: Medication): boolean {
    return (
      this.name === other.name &&
      this.dosage === other.dosage &&
      this.frequency === other.frequency &&
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate?.getTime() === other.endDate?.getTime() &&
      this.prescribedBy === other.prescribedBy &&
      this.notes === other.notes
    )
  }

  toString(): string {
    return `${this.name} ${this.dosage} - ${this.frequency}`
  }
}