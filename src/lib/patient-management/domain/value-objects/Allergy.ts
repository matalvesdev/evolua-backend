// ============================================================================
// ALLERGY VALUE OBJECT
// Patient allergy information with validation
// ============================================================================

export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening'

export class Allergy {
  constructor(
    public readonly allergen: string,
    public readonly reaction: string,
    public readonly severity: AllergySeverity,
    public readonly diagnosedAt: Date,
    public readonly notes: string | null
  ) {
    if (!allergen || allergen.trim().length === 0) {
      throw new Error('Allergen cannot be empty')
    }

    if (!reaction || reaction.trim().length === 0) {
      throw new Error('Allergic reaction cannot be empty')
    }

    if (allergen.length > 100) {
      throw new Error('Allergen name cannot exceed 100 characters')
    }

    if (reaction.length > 200) {
      throw new Error('Allergic reaction description cannot exceed 200 characters')
    }

    if (diagnosedAt > new Date()) {
      throw new Error('Allergy diagnosis date cannot be in the future')
    }

    if (notes && notes.length > 500) {
      throw new Error('Allergy notes cannot exceed 500 characters')
    }

    const validSeverities: AllergySeverity[] = ['mild', 'moderate', 'severe', 'life_threatening']
    if (!validSeverities.includes(severity)) {
      throw new Error(`Invalid allergy severity: ${severity}`)
    }
  }

  isLifeThreatening(): boolean {
    return this.severity === 'life_threatening'
  }

  isSevere(): boolean {
    return this.severity === 'severe' || this.severity === 'life_threatening'
  }

  getSeverityDisplayName(): string {
    const displayNames: Record<AllergySeverity, string> = {
      'mild': 'Leve',
      'moderate': 'Moderada',
      'severe': 'Grave',
      'life_threatening': 'Risco de Vida'
    }
    
    return displayNames[this.severity]
  }

  equals(other: Allergy): boolean {
    return (
      this.allergen === other.allergen &&
      this.reaction === other.reaction &&
      this.severity === other.severity &&
      this.diagnosedAt.getTime() === other.diagnosedAt.getTime() &&
      this.notes === other.notes
    )
  }

  toString(): string {
    return `${this.allergen}: ${this.reaction} (${this.getSeverityDisplayName()})`
  }
}