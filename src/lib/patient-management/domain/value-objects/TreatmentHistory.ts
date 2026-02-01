// ============================================================================
// TREATMENT HISTORY VALUE OBJECT
// Historical treatment record
// ============================================================================

export class TreatmentHistory {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly startDate: Date,
    public readonly endDate: Date | null,
    public readonly goals: string[],
    public readonly recordedAt: Date
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('Treatment history ID cannot be empty')
    }

    if (!description || description.trim().length === 0) {
      throw new Error('Treatment description cannot be empty')
    }

    if (description.length > 1000) {
      throw new Error('Treatment description cannot exceed 1000 characters')
    }

    if (startDate > new Date()) {
      throw new Error('Treatment start date cannot be in the future')
    }

    if (endDate && endDate < startDate) {
      throw new Error('Treatment end date cannot be before start date')
    }

    if (goals.length === 0) {
      throw new Error('Treatment must have at least one goal')
    }
  }

  isActive(): boolean {
    return this.endDate === null || this.endDate > new Date()
  }

  getDuration(): number | null {
    if (!this.endDate) {
      return null // Still active
    }

    const diffTime = this.endDate.getTime() - this.startDate.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) // Days
  }

  equals(other: TreatmentHistory): boolean {
    return (
      this.id === other.id &&
      this.description === other.description &&
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate?.getTime() === other.endDate?.getTime() &&
      JSON.stringify(this.goals) === JSON.stringify(other.goals)
    )
  }
}