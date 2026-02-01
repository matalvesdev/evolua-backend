// ============================================================================
// GENDER VALUE OBJECT
// Represents gender with validation
// ============================================================================

export type GenderType = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export class Gender {
  constructor(public readonly value: GenderType) {
    const validGenders: GenderType[] = ['male', 'female', 'other', 'prefer_not_to_say']
    
    if (!validGenders.includes(value)) {
      throw new Error(`Invalid gender: ${value}. Must be one of: ${validGenders.join(', ')}`)
    }
  }

  getDisplayName(): string {
    const displayNames: Record<GenderType, string> = {
      'male': 'Masculino',
      'female': 'Feminino',
      'other': 'Outro',
      'prefer_not_to_say': 'Prefiro não informar'
    }
    
    return displayNames[this.value]
  }

  equals(other: Gender): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}