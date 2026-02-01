// ============================================================================
// TREATMENT PLAN VALUE OBJECT
// Treatment plan with validation
// ============================================================================

export class TreatmentPlan {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly goals: string[],
    public readonly startDate: Date,
    public readonly endDate: Date | null,
    public readonly frequency: string,
    public readonly duration: number // in minutes
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('Treatment plan ID cannot be empty')
    }

    if (!description || description.trim().length === 0) {
      throw new Error('Treatment plan description cannot be empty')
    }

    if (description.length > 1000) {
      throw new Error('Treatment plan description cannot exceed 1000 characters')
    }

    if (goals.length === 0) {
      throw new Error('Treatment plan must have at least one goal')
    }

    if (startDate > new Date()) {
      throw new Error('Treatment plan start date cannot be in the future')
    }

    if (endDate && endDate < startDate) {
      throw new Error('Treatment plan end date cannot be before start date')
    }

    if (!frequency || frequency.trim().length === 0) {
      throw new Error('Treatment frequency cannot be empty')
    }

    if (duration <= 0) {
      throw new Error('Treatment duration must be positive')
    }

    if (duration > 480) { // 8 hours max
      throw new Error('Treatment duration cannot exceed 480 minutes')
    }

    // Validate goals
    for (const goal of goals) {
      if (!goal || goal.trim().length === 0) {
        throw new Error('Treatment goals cannot be empty')
      }
      if (goal.length > 200) {
        throw new Error('Each treatment goal cannot exceed 200 characters')
      }
    }
  }

  isActive(): boolean {
    return this.endDate === null || this.endDate > new Date()
  }

  equals(other: TreatmentPlan): boolean {
    return (
      this.id === other.id &&
      this.description === other.description &&
      JSON.stringify(this.goals) === JSON.stringify(other.goals) &&
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate?.getTime() === other.endDate?.getTime() &&
      this.frequency === other.frequency &&
      this.duration === other.duration
    )
  }
}