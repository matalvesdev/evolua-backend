// ============================================================================
// DIAGNOSIS VALUE OBJECT
// Medical diagnosis with validation
// ============================================================================

export class Diagnosis {
  constructor(
    public readonly code: string,
    public readonly description: string,
    public readonly diagnosedAt: Date,
    public readonly severity: 'mild' | 'moderate' | 'severe' | 'unknown'
  ) {
    if (!code || code.trim().length === 0) {
      throw new Error('Diagnosis code cannot be empty')
    }

    if (!description || description.trim().length === 0) {
      throw new Error('Diagnosis description cannot be empty')
    }

    if (description.length > 500) {
      throw new Error('Diagnosis description cannot exceed 500 characters')
    }

    if (diagnosedAt > new Date()) {
      throw new Error('Diagnosis date cannot be in the future')
    }
  }

  equals(other: Diagnosis): boolean {
    return (
      this.code === other.code &&
      this.description === other.description &&
      this.diagnosedAt.getTime() === other.diagnosedAt.getTime() &&
      this.severity === other.severity
    )
  }

  toString(): string {
    return `${this.code}: ${this.description}`
  }
}